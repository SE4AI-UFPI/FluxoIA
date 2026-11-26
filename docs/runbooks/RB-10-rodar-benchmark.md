# RB-10 — Rodar o benchmark no Golden Set

## Quando usar
- **Obrigatoriamente antes de qualquer mudança permanente de IA** (alteração de system prompt, esquema `BpmnEstruturaGerada`, troca de modelo ou provedor no LiteLLM — Seção III.6).
- **Rotina trimestral** de avaliação contínua para detectar deriva silenciosa de qualidade do provedor comercial (Seção I.6.9 / III.3).

## Artefatos no repositório
- **Gabarito oficial (CEU v1.0):** `eda_corpus/data/gabarito/`
  - `2_1_licenca_demolicao.json`
  - `2_2_certidao_demolicao.json`
  - `2_3_certidao_uso_do_solo.json`
  - `2_4_demandas_administrativas_construa_facil.json`
  - `2_5_certidao_diretrizes_municipais.json`
- **Casos validados do piloto / operação assistida:** `eda_corpus/data/piloto/` (processos homologados com nota `≥ 4`).
- **Notebook e dependências de avaliação:** `eda_corpus/notebooks/eda.ipynb` e `eda_corpus/requirements.txt`.

## Critérios mínimos de aprovação (Seção I.6.9)
- **Entrevista completa:** nota média geral **≥ 0,85** (escala 0 a 1) e **100%** de respostas aproveitáveis (0 rejeições de esquema).
- **Entrevista realista (curta/com lacunas):** nota no máximo **0,05** abaixo da média dos modelos topo de linha de referência.
- **Linha de base (M3 — `deepseek-chat`):** `0,911` (completa) e `0,463` (realista), em `63,0 s` / `48,6 s` e `US$ 0,012` por execução.

## Procedimento

### 1. Preparar ambiente Python isolado para o benchmark
A partir da raiz do repositório:
```bash
python3 -m venv .venv-bench
source .venv-bench/bin/activate
pip install -r eda_corpus/requirements.txt
```
*(No Windows PowerShell: `python -m venv .venv-bench`, `.\.venv-bench\Scripts\Activate.ps1`, `pip install -r eda_corpus/requirements.txt`.)*

### 2. Executar o notebook / suíte de avaliação
Garanta que o proxy LiteLLM (ou chave do provedor avaliado) esteja acessível e execute o notebook de avaliação em `eda_corpus/notebooks/eda.ipynb`:
```bash
jupyter nbconvert --to notebook --execute eda_corpus/notebooks/eda.ipynb --output eda_resultado.ipynb
```
*(Ou abra `eda_corpus/notebooks/eda.ipynb` no Jupyter / VS Code e execute todas as células, registrando a saída.)*

> **Nota de evolução (CI):** caso a equipe automatize o benchmark em script CLI dedicado (ex.: `python -m eda_corpus.benchmark`) para execução no pipeline de CI na `v1.1.0`/`v1.2`, atualize o comando exato nesta seção.

### 3. Comparar resultados e registrar
Compare as 7 medidas (etapas, ordem das ligações, raias, etapa na raia certa, códigos de taxa, documentos, prazo) e a taxa de rejeição contra a linha de base (`0,911` / `0,463`).
- **Se aprovado:** registrar versão do modelo, hash do prompt e notas obtidas no relatório de avaliação e seguir para liberação (**RB-08**).
- **Se reprovado:** não promover a mudança para produção; ajustar prompt ou manter o modelo anterior.
