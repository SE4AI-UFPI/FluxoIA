# Consulta das etapas após o envio para validação

## Objetivo

Permitir ao autor consultar os dados iniciais, as respostas da entrevista e a
avaliação enviada quando o processo estiver aguardando validação, aprovado ou
publicado. A consulta não deve alterar respostas, etapa persistida, status ou
data de atualização, nem disparar salvamento, geração ou reenvio.

Cada fase deve ser auditada e commitada separadamente pelo responsável pelo
repositório antes de avançar para a seguinte.

## Fase 1 — Restaurar a avaliação persistida

Implementada, aguardando auditoria e commit.

- Tipar `feedbacks_ia` no contrato da API.
- Restaurar todos os campos da avaliação mais recente ao carregar o processo.
- Identificar a ausência de avaliação persistida, para não apresentar valores
  iniciais do formulário como respostas enviadas na futura consulta.
- Atualizar essa informação também após o envio para validação.
- Validar seleção por data, resposta negativa, comentários e independência dos
  dados restaurados em relação ao objeto retornado pela API.

Validação: cinco testes da restauração e três testes de regressão do PDF
passaram; build passou; lint sem erros, com 22 avisos preexistentes.

Mensagem sugerida: `fix(mapping): restaura avaliacao persistida ao reabrir processo`

## Fase 2 — Proteger a entrevista na API

Pendente.

- Restringir os dados da entrevista ao autor nas respostas da API, incluindo as
  respostas construídas pelas ações específicas do processo.
- Manter a consulta autorizada após o envio.
- Verificar os bloqueios de alteração nos estados aguardando validação,
  aprovado e publicado.
- Testar acesso do autor, ausência da entrevista para outros usuários e recusa
  de alterações após o envio.

Mensagem sugerida: `fix(api): protege consulta da entrevista apos submissao`

## Fase 3 — Apresentar as etapas em somente leitura

Pendente.

- Adicionar modo de consulta aos dados iniciais, entrevista e avaliação.
- Exibir perguntas e respostas salvas, inclusive etapas opcionais sem resposta.
- Exibir a avaliação persistida ou indicar sua ausência.
- Remover os controles de alteração, geração e envio nesse modo e identificar
  claramente que os dados estão em somente leitura.
- Verificar acessibilidade e apresentação em telas menores.

Mensagem sugerida: `feat(mapping): apresenta etapas em modo somente leitura`

## Fase 4 — Liberar a navegação de consulta

Pendente.

- Separar a etapa exibida localmente da etapa persistida do processo.
- Permitir navegar pelas etapas de processos enviados, aprovados e publicados.
- Bloquear autosave e comandos de alteração nesses estados.
- Tratar falhas ao carregar um processo sem substituir sua consulta por um
  rascunho local de outro contexto.
- Testar que navegar, voltar e recarregar preservam os dados e não enviam
  requisições de escrita; verificar também a edição normal de rascunhos e
  processos devolvidos para correção.

Mensagem sugerida: `feat(mapping): libera consulta das etapas apos validacao`
