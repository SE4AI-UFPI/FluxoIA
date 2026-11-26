# RB-04 — Rotacionar chave do provedor de LLM

## Quando usar
- Suspeita de vazamento ou comprometimento da chave do provedor comercial (mudança **Emergencial** — registro em até 24h).
- Erro HTTP `401` (chave inválida/revogada) retornado pelo provedor (**RB-05**).
- Transição de conta da equipe (homologação) para conta institucional da SECTI (Seção V.2).

## Procedimento

### 1. Gerar nova chave no provedor comercial
Acesse o painel do provedor de LLM em uso (ex.: DeepSeek ou OpenAI) na conta institucional e gere uma **nova API Key**, mantendo a antiga ativa temporariamente até concluir a validação.

### 2. Atualizar a credencial no LiteLLM
1. Abra túnel SSH e acesse a UI do LiteLLM (`http://localhost:4000/ui`) conforme **RB-03**.
2. Em **Models + Endpoints**, edite o modelo associado ao alias **`fluxoia-geracao`** e substitua a chave antiga pela nova.
3. Caso utilize `LLM_UPSTREAM_API_KEY` no `.env` para servidor local/compatível, atualize também o `.env` no servidor.

### 3. Reiniciar o container do LiteLLM
```bash
docker compose restart litellm
docker compose logs --tail=100 litellm
```
*(Se a virtual key `LLM_API_KEY` do `.env` usada entre `backend` e `litellm` também tiver sido rotacionada, atualize o `.env` e rode `docker compose up -d backend`.)*

### 4. Testar 1 geração antes de revogar a chave antiga
1. Execute **Test Connect** na UI do LiteLLM.
2. Realize 1 geração de BPMN na aplicação e confirme status `success` em `LiteLLM_SpendLogs` ou nos logs do backend.

### 5. Revogar a chave antiga
Somente após confirmar que a nova chave está operando sem erros, acesse o painel do provedor e **revogue a chave anterior**.

### 6. Registrar evidência
Se a rotação decorreu de incidente de segurança ou erro em produção, registre causa, horário da troca e confirmação de revogação no registro de incidentes (até 24h).
