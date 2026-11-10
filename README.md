# FluxoIA

Ferramenta para ajudar servidores públicos a **mapear processos** por meio de entrevistas guiadas e diagramas BPMN.

Projeto da disciplina de Tópicos Avançados em Computação Inteligente (UFPI) para a SECTI.

**Demonstração:** https://luisfelipe114.github.io/fluxoia-mockup/

## Problema

Nas secretarias, o mapeamento de processos é manual, leva meses e depende de poucas pessoas que dominam a técnica. O FluxoIA quer deixar esse trabalho mais rápido e mais simples, sem exigir que o servidor conheça BPMN.

## Funcionalidades

- **Autenticação e perfis:** acesso por usuário e controle de menus conforme o perfil.
- **Gestão de usuários:** cadastro administrativo com perfil, setor e permissões complementares.
- **Dashboard operacional:** resumo de processos e lista com busca e filtros por setor e status.
- **Mapeamento de processos:** assistente em quatro etapas para identificar o processo, conduzir a entrevista, gerar o BPMN e registrar a avaliação.

## Fluxo de Mapeamento

1. **Dados iniciais:** nome, setor, objetivo, descrição e normas relacionadas.
2. **Entrevista guiada:** perguntas sobre início, atividades, áreas envolvidas, sequência, responsáveis, aprovações, regras, exceções, documentos, sistemas e encerramento.
3. **Fluxo BPMN:** geração do diagrama a partir das respostas, com navegação e exportação em BPMN/XML, SVG e PDF.
4. **Avaliação:** registro de feedback, regeneração com controle de versão e confirmação para encaminhamento ao gestor.

## Estado Atual

O cadastro de usuários é integrado à API Django. O mapeamento de processos ainda funciona como protótipo no navegador: rascunhos e histórico ficam na sessão atual, e o BPMN é montado a partir das respostas. Integração com IA, persistência de processos e validação efetiva pelo gestor são etapas futuras.

## Executando com Docker

Sobe frontend (nginx), backend (Django + gunicorn), LiteLLM Proxy e banco (PostgreSQL) com um comando:

```bash
cp .env.example .env   # ajuste DJANGO_SECRET_KEY, POSTGRES_PASSWORD, LITELLM_MASTER_KEY, LITELLM_SALT_KEY e, em VPS, DJANGO_ALLOWED_HOSTS
docker compose up -d --build
```

### LiteLLM Proxy

O backend acessa os modelos só pelo LiteLLM, pelo alias `fluxoia-geracao`. O YAML mantém `model_list: []`: os modelos e suas credenciais são cadastrados pela UI/API e persistidos no banco, com `STORE_MODEL_IN_DB=True`. Assim, o provedor e o modelo real podem ser alterados sem mudar o código da aplicação. O proxy não tem porta pública: a UI fica em `http://localhost:4000/ui` (porta ajustável em `LITELLM_UI_PORT`) (usuário `admin`, senha = `LITELLM_MASTER_KEY`). Na VPS, acesse por túnel SSH: `ssh -L 4000:localhost:4000 usuario@vps`.

No primeiro deploy, abra **Models + Endpoints → Add Model** e cadastre um modelo com o nome público **`fluxoia-geracao`** (o campo pode aparecer como *Public Model Name* ou *Model Name*). Selecione o provedor, o identificador do modelo real e as credenciais; quando necessário, informe também a URL do provedor. Configure o timeout em 110 segundos, abaixo dos 120 segundos do backend. Teste a conexão antes de usar a geração na aplicação. Se já existe um modelo com esse nome no banco, reutilize-o.

Para trocar o modelo, edite a definição persistida mantendo o nome público `fluxoia-geracao`. Não adicione outra definição com esse mesmo nome, a menos que queira distribuir requisições entre os modelos. Modelos declarados no YAML são carregados junto dos modelos do banco; por isso, deixamos o YAML sem modelos, evitando uma entrada fixa que a UI não consegue gerenciar.

`litellm_settings.drop_params: true` descarta parâmetros não suportados pelo modelo selecionado. Isso melhora a compatibilidade entre provedores, mas o parâmetro descartado deixa de influenciar a geração. Mudanças no YAML exigem `docker compose restart litellm`; modelos cadastrados pela UI/API permanecem no banco. Em uma instalação nova, a geração só funciona após cadastrar o alias. Preserve o volume do PostgreSQL e a mesma `LITELLM_SALT_KEY` para recuperar as credenciais persistidas.

No primeiro deploy, gere a virtual key do backend e reinicie-o:

```bash
docker compose exec litellm python3 -c "import json,os,urllib.request as u; r=u.Request('http://localhost:4000/key/generate', data=json.dumps({'key_alias':'fluxoia-backend','models':['fluxoia-geracao']}).encode(), headers={'Authorization':'Bearer '+os.environ['LITELLM_MASTER_KEY'],'Content-Type':'application/json'}); print(json.load(u.urlopen(r))['key'])"
```

Copie a chave para `LLM_API_KEY` no `.env` e rode `docker compose up -d backend`. A key também pode ser criada pela UI, em *Virtual Keys*.

O banco `litellm` é criado automaticamente só quando o volume do Postgres é novo. Se o volume já existia, crie-o uma vez:

```bash
docker compose exec db psql -U fluxoia -d fluxoia -c "CREATE DATABASE litellm;"
```

Antes do build, confira se o `requirements.txt` está igual aos pacotes do seu venv (com o venv do backend ativado). O script só avisa e não altera nada:

```bash
python backend/scripts/check_requirements.py
```

Para atualizar o arquivo, use `pip freeze > backend/requirements.txt` (no PowerShell: `pip freeze | Out-File -Encoding utf8 backend/requirements.txt`).

A aplicação fica em `http://localhost:${APP_PORT}` (porta 80 por padrão). O navegador só fala com o nginx, que repassa `/api` ao backend, então a API não precisa de porta pública.

Comandos úteis:

```bash
docker compose logs -f backend          # acompanhar o backend
docker compose exec backend python manage.py createsuperuser
docker compose down                     # parar (mantém o banco)
docker compose down -v                  # parar e apagar o banco
```

Se o servidor de LLM (Ollama) rodar na própria máquina, ele precisa escutar em `0.0.0.0` para ser alcançado pelo container.

## Equipe

- Jaderson Emanuel da Rocha Costa (Engenharia de Dados)
- Luis Felipe Cabral Brito (Engenharia de Machine Learning)
- Anthony Rios Amorim e Micaias Carvalho Vieira (Engenharia de Software)

Orientação: Prof. Guilherme Avelino, UFPI.
