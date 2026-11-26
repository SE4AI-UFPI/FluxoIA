# RB-08 — Atualizar versão e rollback

## Quando usar
- Implantação de nova release validada em homologação (ex.: `v1.1.0`) para produção, seguindo a **Seção II.6** e o **Smoke test (Seção II.7)**.

## Pré-requisitos
- Checklist de liberação (**Seção II.5 — go/no-go**) aprovado.
- Acesso SSH ao servidor de destino com permissões de Docker e Git.

---

## Procedimento de Implantação

### 1. Anunciar janela de manutenção
Comunicar aos usuários com antecedência mínima de **24 horas** (para atualizações planejadas em produção).

### 2. Executar backup obrigatório antes da mudança
Execute o **RB-02** e confirme que o dump foi salvo fora do host:
```bash
mkdir -p /backup
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-fluxoia}" fluxoia | gzip > "/backup/fluxoia_pre_deploy_$(date +%F_%H%M).sql.gz"
```

### 3. Atualizar o código para a tag da release
Anote o commit atual antes de trocar (para facilitar rollback):
```bash
git rev-parse HEAD
git fetch --tags
git checkout v1.1.0
```
*(Substitua `v1.1.0` pela tag da release desejada.)*

### 4. Conferir variáveis de ambiente
Compare o `.env` em produção com o `.env.example` da nova tag para garantir que nenhuma variável nova ficou faltando:
```bash
diff -u .env.example .env || true
```

### 5. Reconstruir e subir os containers
```bash
docker compose up -d --build
```

### 6. Aplicar migrações do banco de dados
```bash
docker compose exec backend python manage.py migrate
```
*(Em implantação inicial de produção sem carga prévia, rodar o seed apenas de perguntas e setores, sem contas de teste.)*

### 7. Executar Smoke Test pós-implantação (Seção II.7)
Verifique obrigatoriamente todos os 8 itens abaixo e registre o resultado:
1. Abrir a URL por HTTPS (tela de login, certificado válido).
2. Login como Operacional, Supervisor e Administrador (contas reais) — menus corretos por perfil.
3. Criar processo e responder a uma pergunta com texto vago — alerta do validador em `≤ 5 s`.
4. Gerar BPMN com o caso de referência — diagrama válido, barra de progresso, `≤ 120 s`.
5. Enviar para validação → devolver → reenviar → homologar — transições e versões registradas.
6. Exportar `.bpmn` e PDF — `.bpmn` reabre no editor; PDF traz diagrama e ficha técnica.
7. Consultar o LiteLLM (`LiteLLM_SpendLogs`) e logs do backend — chamadas com status `success`, sem `5xx`.
8. Testar a porta `4000` a partir de rede externa — conexão recusada.

---

## Procedimento de Rollback (se o Smoke Test falhar)

1. Retornar ao commit/tag estável anterior (ex.: `9fb6b4f6` ou tag anterior):
```bash
git checkout <commit-ou-tag-anterior>
docker compose up -d --build
```
2. **Se houve migração de banco incompatível na nova versão:** parar o `backend` e restaurar o backup gerado no passo 2 conforme o **RB-02**:
```bash
docker compose stop backend
gunzip -c /backup/fluxoia_pre_deploy_AAAA-MM-DD_HHMM.sql.gz | docker compose exec -T db psql -U "${POSTGRES_USER:-fluxoia}" fluxoia
docker compose up -d backend
```
3. Validar acesso à versão restaurada e registrar o incidente (causa, impacto e ações para correção).
