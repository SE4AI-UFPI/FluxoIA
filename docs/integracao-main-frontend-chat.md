# Integração de main em feat/frontend-chat

Base integrada: `origin/main` em `264a81a`.
Origem do trabalho de frontend: `2d20e47`.

## Resolução

- `useProcessWizard.ts`: preservados os bloqueios de consulta, a separação da
  etapa exibida, o carregamento com erro e nova tentativa, a restauração da
  avaliação e a função da main que impede regressão de status. A abertura de
  um processo editável só organiza o BPMN quando o layout precisa de correção;
  processos enviados/aprovados/publicados não fazem esse ajuste nem autosave.
- `process.service.ts`: combinadas a restauração da avaliação e a identificação
  de processos devolvidos pela supervisão. O parecer mais recente é escolhido
  pela data, independentemente da ordem do array, também no painel operacional.
- `ProcessMappingPage.tsx`: mantidos os pareceres detalhados, itens do checklist,
  navegação de consulta e exportação da entrevista. O rodapé distingue consulta
  de rascunho local. A confirmação de salvamento continua se referindo à sessão,
  pois o hook mantém fallback local quando a sincronização com a API falha.
- As demais alterações da main, incluindo edição de usuários e ajustes do
  visualizador BPMN, foram mantidas.

## Validação

- Backend: **55 testes passaram** em container temporário com SQLite de teste.
  Incluem geração com resposta de IA simulada, solicitação de correção,
  devolução para refazer, correção/regeração, reenvio, aprovação, publicação,
  leitura da entrevista pelo autor, bloqueio de alterações e edição cadastral
  completa sem redefinir a senha.
- Frontend: **26 testes passaram** entre renderização, mapeamento de status e
  pareceres, restauração da avaliação e exportação de PDF/Markdown.
- Navegador: **9 testes de integração passaram** no harness com API e
  armazenamento simulados, verificando consulta imutável, edição, preservação
  de status, falhas de carregamento e troca de URL durante a requisição.
- Conferência manual no navegador com dados fictícios: editar uma resposta,
  concluir a entrevista, gerar o BPMN, avaliar e reenviar preserva o parecer
  até o envio e passa a somente leitura depois. A consulta mantém perguntas e
  respostas explícitas e os botões de exportação. A edição de usuário envia
  PATCH e não inclui senha quando o campo opcional está vazio.
- `npm run build`: aprovado. Lint: zero erros e 23 avisos no código integrado.
- `python manage.py check`: sem problemas.

Os testes não chamam provedores reais de IA, não usam a chave do usuário e não
alteram o banco da aplicação. Não houve teste de geração real via LiteLLM nem
reconstrução/reinício dos serviços da aplicação. A integração deve ser auditada
e concluída com o commit de merge antes de atualizar o PR.

## Repetir verificações

Na pasta `frontend`:

```bash
npm run build
npm run lint
node tests/run-process-readonly.mjs
node --experimental-strip-types --test tests/interview-export.test.ts tests/process-feedback.test.ts tests/bpmn-pdf.test.ts
npm run dev
# Abrir http://localhost:5173/tests/wizard-consultation.html para os nove testes do navegador.
```

Na raiz, com os serviços e a imagem do backend disponíveis:

```bash
docker compose run --rm --no-deps -v "$(pwd)/backend:/app" -e POSTGRES_DB= backend python -m pytest -q
docker compose run --rm --no-deps -v "$(pwd)/backend:/app" -e POSTGRES_DB= backend python manage.py check
```
