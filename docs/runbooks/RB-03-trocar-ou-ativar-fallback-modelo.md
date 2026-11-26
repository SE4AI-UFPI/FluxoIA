# RB-03 — Trocar ou ativar fallback de modelo

## Quando usar
- Indisponibilidade, lentidão persistente (`> 120 s` no p95) ou limite de cota do modelo principal.
- Decisão de trocar o modelo padrão (ex.: testar `gpt-5.4-mini` para reduzir latência, ou migrar para modelo local via Ollama/vLLM quando houver servidor com GPU — ADR-03).

## Arquitetura de configuração
- O backend chama exclusivamente o alias lógico `fluxoia-geracao` no LiteLLM (`LLM_MODEL=fluxoia-geracao`).
- Em `litellm/config.yaml`, `model_list` é mantido vazio (`[]`) e `STORE_MODEL_IN_DB=True` está ativo no `docker-compose.yml`, portanto **os modelos reais são gerenciados pela UI/API do LiteLLM e persistidos no banco `litellm`**.
- Não é necessário alterar código do backend para trocar o modelo ou provedor.

## Procedimento

### 1. Acessar a UI administrativa do LiteLLM via túnel SSH
Com a porta `4000` restrita a `127.0.0.1` na VPS, abra o túnel a partir da máquina do operador:
```bash
ssh -L 4000:127.0.0.1:4000 <usuario>@<ip-do-servidor>
```
No navegador local, acesse: `http://localhost:4000/ui`  
- **Usuário:** `admin`  
- **Senha:** valor de `LITELLM_MASTER_KEY` no `.env` do servidor.

### 2. Alterar o modelo ou configurar fallback
1. No menu lateral da UI do LiteLLM, acesse **Models + Endpoints**.
2. Localize a entrada com nome público **`fluxoia-geracao`**.
3. **Para trocar o modelo ativo:** edite essa definição mantendo o nome público `fluxoia-geracao`, informando o novo provedor, identificador do modelo real, chave/endpoint e timeout (`110 s`, abaixo dos `120 s` do backend).
4. **Para ativar/configurar fallback:** na seção de roteamento/fallback (ou mantendo a configuração de fallback definida pela equipe), aponte o modelo alternativo a ser usado quando o principal falhar.
5. Utilize o botão **Test Connect** na UI antes de salvar.

### 3. Reiniciar o container do LiteLLM (se necessário após ajustes de config)
```bash
docker compose restart litellm
docker compose ps litellm
```

### 4. Validar com 1 geração de teste
1. Acesse o FluxoIA com uma conta de teste/homologação.
2. Execute uma geração de BPMN e verifique nos logs se não há erros:
```bash
docker compose logs --tail=100 litellm
docker compose logs --tail=100 backend
```

## Governança (Mudança Normal de IA — Seção III.6)
- **Uso emergencial (contorno de incidente):** pode ser ativado imediatamente com registro no canal de incidentes.
- **Mudança permanente em produção:** exige aprovação do **Dono do serviço** e execução prévia do benchmark no golden set (**RB-10**), garantindo desempenho igual ou superior à linha de base sem queda na entrevista realista.
