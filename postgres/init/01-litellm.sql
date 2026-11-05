-- Banco separado para o LiteLLM (virtual keys e registro de gasto).
-- Roda só na criação do volume pgdata; em volume existente, execute à mão:
--   docker compose exec db psql -U fluxoia -d fluxoia -c "CREATE DATABASE litellm;"
CREATE DATABASE litellm;
