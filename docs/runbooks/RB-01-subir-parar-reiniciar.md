# RB-01 — Subir, parar e reiniciar serviços

## Quando usar
- Verificação diária de saúde dos containers (rotina III.3).
- Reinício de serviço após alteração de `.env` ou manutenção programada.
- Recuperação inicial quando um container (`frontend`, `backend`, `litellm` ou `db`) apresentar travamento.

## Serviços da stack (`docker-compose.yml`)
- `frontend`: Nginx servindo a SPA React e fazendo proxy reverso de `/api` para `backend`.
- `backend`: API Django REST + Gunicorn.
- `litellm`: LiteLLM Proxy (porta interna `4000`, `STORE_MODEL_IN_DB=True`).
- `db`: PostgreSQL 17 (bancos `fluxoia` e `litellm`).

## Procedimento

### 1. Verificar estado atual dos containers
```bash
docker compose ps
```
Todos os serviços devem aparecer com status `Up` (e `healthy` para `db` e `litellm`).

### 2. Subir toda a stack em segundo plano
```bash
docker compose up -d
```

### 3. Reiniciar apenas o backend (sem derrubar o banco)
```bash
docker compose restart backend
```
*(Para outros serviços específicos, substitua `backend` por `frontend` ou `litellm`.)*

### 4. Parar toda a stack (mantendo volumes e dados do banco)
```bash
docker compose down
```
> **Atenção:** nunca execute `docker compose down -v` em homologação ou produção, pois `-v` apaga o volume `pgdata` com todos os dados dos bancos `fluxoia` e `litellm`.

### 5. Inspecionar logs recentes
```bash
docker compose logs --tail=200 backend
docker compose logs --tail=200 litellm
docker compose logs --tail=100 frontend
```

## Validação
- `docker compose ps` mostra todos os 4 containers em execução.
- Acesso à interface web pela URL institucional (HTTP/HTTPS) carrega a tela de login sem erro `502 Bad Gateway`.
