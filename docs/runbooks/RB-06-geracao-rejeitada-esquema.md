# RB-06 — Geração rejeitada pelo esquema

## Quando usar
- O backend rejeita a resposta devolvida pelo LLM durante o parsing JSON, validação Pydantic (`BpmnEstruturaGerada`) ou validação estrutural (regras de grafo / tipos de elemento permitidos).
- Alerta da Seção III.4: `Gerações rejeitadas pelo esquema > 5% na semana ou 2 seguidas`.

## Comportamento esperado do sistema (FA-03)
- O LLM nunca gera XML diretamente: ele retorna JSON validado por código (ADR-01).
- Se a saída violar o esquema (ex.: tipo de elemento fora da lista aceita como `boundaryEvent` ou `parallelGateway`, campo obrigatório ausente ou JSON malformado), a geração é **rejeitada**, nenhum XML inválido é persistido e a entrevista permanece salva.

## Procedimento

### 1. Inspecionar o log do backend para identificar o motivo exato
```bash
docker compose logs --tail=200 backend | grep -iE "BpmnEstruturaGerada|ValidationError|JSON|esquema|gerar-bpmn-ia|error"
```
Identifique:
- Qual campo ou regra falhou (ex.: `ValidationError`, tipo de elemento não aceito, `origem`/`destino` inexistente).
- Se ocorreu em apenas 1 processo específico ou em processos diferentes.

### 2. Avaliar a frequência
- **Caso isolado (1 ocorrência pontual):** oriente o usuário Operacional a verificar se alguma resposta da entrevista ficou incompleta ou ambígua e clicar em **"Gerar BPMN com IA"** novamente.
- **Caso recorrente (`> 2` falhas seguidas ou `> 5%` na semana):**
  1. Abrir incidente **S2** (função central degradada — resposta em 4h úteis, solução/contorno em 1 dia útil) e acionar o gatilho de pausa se persistir.
  2. Verificar se houve mudança recente no system prompt (`backend/core/services/bpmn_ai_service.py`), no modelo configurado no alias `fluxoia-geracao` no LiteLLM ou atualização silenciosa do provedor.
  3. Consultar `LiteLLM_SpendLogs` para checar qual modelo respondeu às chamadas com falha e se houve truncamento por limite de tokens de saída.

### 3. Contorno e correção definitiva
- **Contorno imediato:** alternar para o modelo de fallback validado no LiteLLM (**RB-03**).
- **Correção definitiva:** ajustar o prompt/esquema em desenvolvimento, rodar o benchmark no golden set (**RB-10**) e liberar nova versão via **RB-08**.
