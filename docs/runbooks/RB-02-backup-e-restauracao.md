# RB-02 — Backup e restauração do PostgreSQL

## Quando usar
- Rotina diária automatizada (cron) de backup dos bancos.
- Antes de qualquer atualização de versão (**RB-08** / Seção II.6).
- Teste mensal de restauração em ambiente separado (critério RPO 24h / RTO 4h úteis).
- Recuperação após falha grave ou perda de integridade de dados (incidente **S1**).

## Pré-requisitos
- Diretório de destino criado no servidor (ex.: `/backup`) e espaço em disco verificado (`df -h`).
- Variável `POSTGRES_USER` definida no `.env` (padrão: `fluxoia`).

---

## Procedimento de Backup

### 1. Gerar backup compactado do banco `fluxoia`
```bash
mkdir -p /backup
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-fluxoia}" fluxoia | gzip > "/backup/fluxoia_$(date +%F).sql.gz"
```

### 2. (Recomendado) Gerar backup também do banco `litellm`
O banco `litellm` guarda os modelos cadastrados pela UI (`STORE_MODEL_IN_DB=True`), virtual keys e logs de custo/latência (`LiteLLM_SpendLogs`).
```bash
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-fluxoia}" litellm | gzip > "/backup/litellm_$(date +%F).sql.gz"
```

### 3. Validar integridade e copiar para fora do host
```bash
gzip -t "/backup/fluxoia_$(date +%F).sql.gz"
ls -lh /backup/
```
> **Obrigatório:** copiar os arquivos `.sql.gz` para armazenamento externo ao servidor (ou cofre de backups da TI) para garantir recuperação em caso de perda do host.

---

## Procedimento de Restauração

> **Atenção:** execute a restauração primeiro em ambiente separado no teste mensal. Em produção, anuncie janela de manutenção antes de sobrescrever dados.

### 1. Parar o backend para evitar escritas concorrentes
```bash
docker compose stop backend
```

### 2. Restaurar o arquivo de backup no banco `fluxoia`
Se o banco já existir e precisar de restauração limpa, recrie o banco antes ou restaure sobre base limpa:
```bash
gunzip -c /backup/fluxoia_AAAA-MM-DD.sql.gz | docker compose exec -T db psql -U "${POSTGRES_USER:-fluxoia}" fluxoia
```
*(Se precisar restaurar do zero em um banco recém-criado, crie o banco com `createdb -U fluxoia fluxoia` antes do `psql`.)*

### 3. Subir novamente o backend e validar
```bash
docker compose up -d backend
docker compose logs --tail=100 backend
```

### 4. Executar o Smoke Test
Executar os passos da **Seção II.7 (Smoke test pós-implantação)** (login por perfil, consulta de processos existentes e verificação dos registros restaurados).
