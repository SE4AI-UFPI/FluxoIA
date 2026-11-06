# FluxoIA — Análise e plano do MVP

**Entrega:** terça-feira, 10/11/2026
**Base:** [`requisitos.md`](requisitos.md) v0.6
**Situação de partida (05/11):** só autenticação e CRUD de usuários existem; o resto do fluxo está por fazer.

---

## 1. Escopo do MVP

O MVP precisa demonstrar o caminho completo, de ponta a ponta:

| Etapa | No MVP |
|---|---|
| Acesso | Cadastro com e-mail, senha e nome; login e logout; tela de bloqueio enquanto o admin não define o setor. Usuários e setores geridos pelo Django Admin. |
| Navegação | Menu lateral, dashboard, lista de mapeamentos e página de passo a passo. |
| Entrevista | Chat com as 14 perguntas fixas (Anexo A dos requisitos), salvas a cada resposta, retomada de onde parou, edição até a geração e histórico visível só para o autor. |
| Geração | Uma chamada ao LiteLLM devolve o JSON do fluxo e o resumo, validados com pydantic. O conversor transforma o JSON em BPMN, com raias por setor. |
| Edição | bpmn-js com recursos padrão, antes do envio e depois de uma devolução. Salva o XML e o SVG. |
| Validação | Enviar, aprovar, ou devolver com comentário obrigatório. O corrigido volta direto para validação. |
| Exportação | `.bpmn` e PDF (WeasyPrint) em qualquer status, com histórico de devoluções. |
| Auditoria | Quem gerou, quem aprovou ou devolveu, e quando. |
| Infraestrutura | VPS com Postgres, LiteLLM, Django e nginx, desde o primeiro dia. |

**Fica para depois:** análise prévia por IA, painel de propriedades, comentários no diagrama, telas de administração em React, versionamento, norma, retenção de 15 dias e perguntas de gargalos e melhorias.

---

## 2. Estado atual do código

| Área | Já existe | Falta |
|---|---|---|
| Backend | Modelo `User`, JWT (login, refresh, `me`, troca de senha), CRUD de usuários e testes de autenticação. O SDK `openai` já está nas dependências, e o settings já lê `LLM_BASE_URL`, `LLM_MODEL` e `LLM_API_KEY`. | Setor, mapeamento, entrevista, geração, validação, auditoria e exportação. `ai_engine/` e `bpmn_engine/` estão vazios. |
| Frontend | Login, dashboard provisório, componentes shadcn, identidade visual, `bpmn-js` instalado. | Cadastro, tela de aguardando liberação, menu lateral, chat, editor, telas do chefe, lista e exportação. |

### 2.1 Correções obrigatórias no código existente

1. **Cadastro aceita perfil e setor.** O `RegisterSerializer` permite escolher `papel=validador` e informar `setor`. Deve aceitar só `email`, `nome` e `password` (RF-01, CF-14).
2. **Usuário troca o próprio setor.** O `PATCH /api/auth/me/` remove `papel` e `is_active` para não admins, mas deixa `setor` passar (RF-39).
3. **Setor é texto livre.** `User.setor` é um `CharField`. Deve virar chave estrangeira para um modelo `Setor` (RF-06 a RF-08).
4. **Bloqueio de quem não tem setor.** Criar uma permissão que barre usuários sem setor em todas as rotas de mapeamento (RN-05).
5. **Django Admin.** Ativar `django.contrib.admin` e registrar `User` e `Setor`.
6. **Configuração de produção.** `DEBUG` não deve ser `True` por padrão, e a `SECRET_KEY` não deve ter valor fixo de reserva.
7. **`requirements.txt` em UTF-16.** Converter para UTF-8, para o git mostrar as diferenças, e adicionar `weasyprint`.
8. **Frontend.** Remover `jspdf`, que não será usado.

---

## 3. Arquitetura

### 3.1 Modelo de dados

| Modelo | Campos principais | Observações |
|---|---|---|
| `Setor` | nome, ativo, chefe (FK `User`) | Ser chefe é derivado de chefiar ao menos um setor. Assim não existe chefe sem setor. |
| `User` | setor (FK `Setor`, nulo até o admin definir), papel | `papel` passa a servir só para distinguir o administrador. |
| `Mapeamento` | titulo, setor, autor, status, fluxo_json, bpmn_xml, svg, resumo (JSON), aprovado_por, aprovado_em, criado_em, atualizado_em | `setor` é fixado na criação (RN-12). |
| `Resposta` | mapeamento, pergunta (1–14), texto, editado_em | Uma linha por pergunta. O chat é só uma forma de exibir essas linhas. |
| `Devolucao` | mapeamento, chefe, comentario, criado_em | Permanente (RN-06). |
| `EventoAuditoria` | mapeamento, tipo (criado, gerado, enviado, aprovado, devolvido), usuario, criado_em | Base do RF-36. |

**Status do mapeamento:** `rascunho`, `gerado`, `em_validacao`, `devolvido`, `aprovado`.

As 14 perguntas ficam fixas no código, como uma lista de constantes com número, bloco, texto, frase de transição, exemplo e se aceita "Não se aplica".

### 3.2 Formato intermediário (JSON da IA)

A IA não escreve XML de BPMN. Ela devolve um JSON no mesmo esquema dos gabaritos de `eda_corpus/data/gabarito/`, sem os campos `origem` e `gabarito`, mais o resumo:

```json
{
  "processo": "Certidão de Uso do Solo",
  "objetivo": "…",
  "setores": [{ "id": "s1", "nome": "Requerente" }],
  "elementos": [
    {
      "id": "e1", "numero": "1", "tipo": "inicio | tarefa | fim",
      "nome": "…", "setor": "s1",
      "documentos": [], "sistemas": [], "taxas": [], "prazo": ""
    }
  ],
  "fluxos": [{ "de": "e1", "para": "e2", "condicao": "" }],
  "resumo": {
    "objetivo": "…", "entradas": [], "saidas": [], "responsaveis": []
  }
}
```

- Validação com pydantic: ids únicos, todo `setor` e todo `de`/`para` apontando para ids existentes, exatamente um `inicio` e ao menos um `fim`.
- Se a resposta vier inválida, o backend tenta de novo uma vez; se falhar de novo, devolve erro e as respostas ficam preservadas (US-07).

### 3.3 Geração

- **Uma chamada** ao LiteLLM Proxy, pelo SDK `openai`, com `LLM_BASE_URL` apontando para o proxy, o alias `fluxoia-geracao` e o campo `user` com o id do mapeador, para o proxy atribuir o gasto.
- **Prompt:** as 14 respostas, o esquema do JSON e um gabarito pequeno como exemplo (o 2.4, com 13 elementos).
- **Chamada síncrona,** com timeout de cerca de 120 s e um estado de "gerando" na interface. Para 10 usuários não é preciso fila de tarefas.

### 3.4 Conversor JSON → BPMN (`bpmn_engine`)

- Gera o XML BPMN 2.0 com uma colaboração, uma piscina com o nome do processo e uma raia por setor.
- Mapeamento de elementos: `inicio` → `startEvent`; `tarefa` → `task`; `fim` → `endEvent`; cada fluxo → `sequenceFlow`, com a `condicao` como rótulo.
- Os fluxogramas não usam losangos: os desvios saem direto da tarefa. Quando uma tarefa tem saídas com condição, o conversor insere um `exclusiveGateway` logo depois dela.
- Documentos, sistemas, taxas e prazo entram na `documentation` de cada tarefa.
- **Layout em grade:** a coluna é a ordem do elemento no caminho mais longo a partir do início, ignorando os fluxos de retorno; a linha é a raia do setor. Tamanhos padrão do bpmn-js, conexões ortogonais. O resultado não precisa ser bonito: o mapeador ajusta no editor.
- **Critério de pronto:** os 5 gabaritos convertidos abrem corretamente no bpmn-js. Isso pode ser testado antes de a IA existir.

### 3.5 Editor e PDF

- O editor usa o `Modeler` do bpmn-js. Ao salvar, o frontend envia o XML (`saveXML`) e o SVG (`saveSVG`).
- O backend sanitiza o SVG antes de guardá-lo, removendo scripts, manipuladores de evento e referências externas, porque ele entra no template do PDF sem escape.
- O PDF é um template Django renderizado pelo WeasyPrint, conforme o Anexo B dos requisitos. O modelo de referência foi testado: no WeasyPrint, cabeçalho e rodapé se repetem corretamente; na impressão pelo Chrome, o cabeçalho quebra.

### 3.6 Infraestrutura na VPS

- Postgres, Django com gunicorn (timeout acima de 120 s, por causa da geração), build do frontend servido pelo nginx, com proxy de `/api` para o Django.
- LiteLLM Proxy acessível só pelo backend (rede interna ou firewall), com os aliases configurados no `config.yaml`, uma *virtual key* para o backend no `.env` e registro só de metadados, sem o texto das entrevistas.
- WeasyPrint precisa das bibliotecas do sistema (Pango). Instalar e testar no primeiro dia.

---

## 4. Contrato da API (rascunho)

Todas as rotas, menos cadastro e login, exigem JWT. As rotas de mapeamento exigem setor (RN-05) e respeitam a visibilidade da RN-08.

| Método e rota | Uso | Quem |
|---|---|---|
| `POST /api/auth/register/` | Cadastro (e-mail, nome, senha) | Visitante |
| `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET /api/auth/me/` | Sessão | Usuário |
| `GET /api/perguntas/` | Roteiro da entrevista | Usuário com setor |
| `GET /api/mapeamentos/` | Lista: os meus e, se chefe, os dos setores que chefio. Filtro por status. | Usuário com setor |
| `POST /api/mapeamentos/` | Cria um mapeamento em rascunho | Usuário com setor |
| `GET /api/mapeamentos/{id}/` | Detalhe: status, resumo, XML, devoluções | Autor ou chefe |
| `GET /api/mapeamentos/{id}/entrevista/` | Histórico do chat | Só o autor (RN-10) |
| `PUT /api/mapeamentos/{id}/respostas/{pergunta}/` | Salva ou edita uma resposta | Autor, só em `rascunho` |
| `POST /api/mapeamentos/{id}/gerar/` | Gera fluxo, resumo e BPMN | Autor, em `rascunho` com as 14 respostas |
| `PUT /api/mapeamentos/{id}/diagrama/` | Salva XML e SVG do editor | Autor, em `gerado` ou `devolvido` |
| `PATCH /api/mapeamentos/{id}/resumo/` | Edita o resumo | Autor, em `gerado` ou `devolvido` |
| `POST /api/mapeamentos/{id}/enviar/` | Envia para validação | Autor, em `gerado` ou `devolvido` |
| `POST /api/mapeamentos/{id}/aprovar/` | Aprova | Chefe do setor, em `em_validacao` |
| `POST /api/mapeamentos/{id}/devolver/` | Devolve com comentário obrigatório | Chefe do setor, em `em_validacao` |
| `GET /api/mapeamentos/{id}/auditoria/` | Eventos do mapeamento | Autor ou chefe |
| `GET /api/mapeamentos/{id}/exportar/bpmn/` | Download do `.bpmn` | Autor ou chefe |
| `GET /api/mapeamentos/{id}/exportar/pdf/` | Download do PDF | Autor ou chefe |

---

## 5. Telas do frontend

| Tela | Conteúdo |
|---|---|
| Cadastro | E-mail, nome, senha. |
| Aguardando liberação | Mensagem para quem ainda não tem setor, com botão de sair. |
| Layout | Menu lateral: dashboard, novo mapeamento, lista, passo a passo, sair; atalho para o Django Admin só para o administrador. |
| Dashboard | Mapeamentos recentes; estado vazio com atalho para iniciar. |
| Entrevista (chat) | Mensagens do sistema e do usuário, campo de resposta com exemplo, botão "Não se aplica" nas perguntas 9, 10, 12 e 13, edição pelo balão, botão "Gerar diagrama" no fim e estado de "gerando". |
| Detalhe do mapeamento | Abas: Diagrama (visualização ou editor, conforme o status), Resumo, Entrevista (só o autor), Histórico (devoluções e auditoria). Ações conforme status e perfil: enviar, aprovar, devolver, exportar. |
| Lista | Título, setor, status e data da última atualização; filtro por status, incluindo a fila "Em validação" do chefe. |
| Passo a passo | Página estática com as etapas do fluxo. |

---

## 6. Cronograma

A distribuição segue a área de cada pessoa no README e pode ser ajustada. **Quinta de manhã, antes de tudo:** fechar este contrato da API e o esquema do JSON, para os quatro trabalharem em paralelo.

| Dia | Micaias (backend) | Anthony (frontend) | Luis (IA) | Jaderson (dados e infra) |
|---|---|---|---|---|
| Qui 05/11 | Correções da seção 2.1, modelo `Setor`, Django Admin, modelos e API do mapeamento e das respostas | Layout com menu lateral, cadastro, tela de aguardando liberação, dashboard e lista | Esquema pydantic do JSON, prompt de geração, primeiros testes com os gabaritos | VPS: Postgres, LiteLLM (aliases, chave, registro só de metadados), nginx, dependências do WeasyPrint |
| Sex 06/11 | Validação (enviar, aprovar, devolver), auditoria, filtro de visibilidade (RN-08 e RN-10) | Chat da entrevista: perguntas, respostas, retomada, edição e "Não se aplica" | Cliente LiteLLM e endpoint de geração, com validação e nova tentativa | Conversor JSON → BPMN com layout por raias (com apoio do Luis) |
| Sáb 07 e Dom 08/11 | Exportação `.bpmn` e PDF com WeasyPrint, sanitização do SVG | Editor bpmn-js (salvar XML e SVG), telas do chefe, detalhe com abas | Ajuste do prompt comparando a geração com os gabaritos 2.1 a 2.5 | Os 5 gabaritos abrindo no editor; pipeline de deploy |
| Seg 09/11 | Integração e correções | Integração e correções | Roteiro da demonstração com um processo real | Deploy final. **Escopo congelado ao meio-dia.** |
| Ter 10/11 | Demonstração | | | |

---

## 7. Roteiro da demonstração

Sugestão, usando o processo 2.3 (Certidão de Uso do Solo, 16 elementos):

1. Um visitante se cadastra e vê a tela de aguardando liberação.
2. O administrador define o setor dele e o chefe do setor no Django Admin.
3. O mapeador responde as 14 perguntas no chat, sai no meio e retoma depois.
4. Gera o diagrama, ajusta uma tarefa no editor e envia.
5. O chefe devolve com comentário.
6. O mapeador vê o comentário, corrige no editor e reenvia.
7. O chefe aprova.
8. Exportação do PDF (com o histórico de devoluções) e do `.bpmn`, aberto no bpmn.io.
9. Consulta da auditoria e do histórico da entrevista.

---

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Layout automático do BPMN com retornos entre raias | Grade simples (raia × ordem); ajuste manual no editor. |
| Qualidade da geração sem análise prévia | Exemplos nas perguntas 6, 8 e 9; editor para corrigir antes do envio; comparação com os gabaritos. |
| Deploy deixado para o fim | Subir a VPS na quinta. |
| Configuração insegura em produção | Corrigir o settings (seção 2.1, item 6) antes do deploy. |
| Dados pessoais | O PDF de fluxogramas fica fora do git; a pergunta 4 pede setores, não nomes; o proxy não guarda o texto das entrevistas. |
| Latência da geração | Timeout de cerca de 120 s no backend e no gunicorn; estado de "gerando" na interface. |
