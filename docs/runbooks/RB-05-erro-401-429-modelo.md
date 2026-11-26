# RB-05 — Tratamento de erro 401/429 do modelo

## Quando usar
- Alerta do monitoramento (Seção III.4): `Falhas 401/429 no LiteLLM ≥ 1`.
- Usuários relatam erro ao validar entrevista ou gerar BPMN por falha no provedor de IA.
- Se bloquear completamente a geração de BPMN, classificar como **Incidente S1** (resposta em 1h útil, solução/contorno em 4h úteis).

## Diagnóstico rápido
Verifique os logs recentes do LiteLLM e do backend:
```bash
docker compose logs --tail=150 litellm | grep -iE "401|429|auth|quota|rate|balance|insufficient"
docker compose logs --tail=150 backend | grep -iE "401|429|error|timeout"
```

## Procedimento conforme o código HTTP

### Caso A — Erro `401` (Unauthorized / Chave inválida ou revogada)
1. Confirme se a chave configurada no modelo `fluxoia-geracao` foi revogada ou alterada no provedor.
2. Execute imediatamente o **RB-04 (Rotacionar chave do provedor)**.
3. Se houver fallback configurado com outro provedor ativo, ative o fallback pelo **RB-03** para restabelecer o serviço enquanto a chave principal é regularizada.

### Caso B — Erro `429` (Rate limit ou saldo/crédito esgotado)
1. Acesse o painel de faturamento do provedor comercial (ex.: DeepSeek) e verifique o **saldo disponível** e os limites de requisição por minuto (RPM/TPM).
2. **Se for falta de saldo:** solicite recarga imediata ao responsável financeiro/dono do serviço e, como contorno imediato, ative o modelo de fallback no LiteLLM (**RB-03**).
3. **Se for pico momentâneo de requisições (rate limit):** aguarde 1–2 minutos, repita uma geração de teste e, se persistir, ative o fallback (**RB-03**).

## Comunicação aos usuários (Contorno padrão — Seção III.5)
Informe aos usuários que:
- **As respostas da entrevista já estão salvas no PostgreSQL** (não há perda de trabalho digitado).
- Basta aguardar a normalização/ativação do fallback e acionar novamente **"Gerar BPMN com IA"**.
