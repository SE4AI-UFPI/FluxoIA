# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Mapeador (servidor público):** pessoa que conhece o processo do seu setor, mas não domina BPMN. Faz o mapeamento respondendo a uma entrevista guiada, revisa o diagrama gerado e pede ajustes. Job: descrever o processo real do setor sem precisar aprender a técnica.
- **Chefe do setor (validador):** confere o mapeamento do próprio setor e aprova ou devolve. Job: aprovar o processo do setor ou pedir correção.

## Product Purpose
Plataforma para mapeamento de processos em secretarias públicas (projeto FluxoIA, UFPI, para a SECTI). Hoje o mapeamento é manual, leva meses e depende de poucas pessoas que dominam a técnica. O produto deve reduzir esse tempo e tornar o trabalho acessível a quem executa o processo. Sucesso: um mapeamento aprovado em BPMN, com histórico de versões.

## Positioning
A IA propõe o diagrama a partir de uma entrevista guiada, e o servidor nunca precisa conhecer BPMN. A IA não tem poder de decisão: toda versão passa pela aprovação do chefe do setor antes de ser considerada final.

## Operating Context
- Fluxo de uso: login → dashboard com sidebar → passo a passo de uso → entrevista com IA (perguntas pré-definidas) → geração do mapeamento → avaliação pelo chefe do setor → lista de processos mapeados e edição → exportação em PDF ou BPMN → logout.
- Ciclo de validação:
  - O chefe do setor aprova ou devolve.
  - Se devolvido, o mapeador corrige manualmente ou a resposta do chefe é usada como entrada para a IA corrigir o mapeamento.
- Ambiente: servidores de secretarias públicas, usando navegador em computador de trabalho.

## Capabilities and Constraints
- Entrevista com perguntas pré-definidas que gera a primeira versão do mapeamento.
- Geração do mapeamento por IA a partir das respostas, com correção por IA a partir do feedback do chefe do setor.
- Editor BPMN embutido na aplicação, com download do arquivo `.bpmn`.
- Exportação em PDF e BPMN.
- Cada aprovação vira uma versão guardada, com motivo e norma (conforme README).
- Textos das entrevistas podem ser enviados a provedor externo de IA por API.
- Stack já definida pelo repositório: backend em Django REST (`backend/`) e frontend em React + Vite + TypeScript + Tailwind + shadcn (`frontend/`). Autenticação JWT já implementada no backend.
- Terminologia: "mapeamento" (processo mapeado em BPMN), "mapeador", "chefe do setor".
- Em aberto: escolha do provedor de IA e do modelo; formato exato das perguntas da entrevista; critérios para considerar uma versão "norma" no histórico.

## Brand Commitments
Nome: FluxoIA. Projeto acadêmico (UFPI) com parceria da SECTI; sem identidade visual definida até o momento.

## Evidence on Hand
- README do repositório com problema, proposta e equipe.
- Demonstração existente (mockup): https://luisfelipe114.github.io/fluxoia-mockup/
- Diretório `eda_corpus/` (dados e notebooks de exploração, não verificados como conteúdo do produto).
- Não há entrevistas reais, nem lista oficial de perguntas, nem processos de exemplo confirmados. Não inventar depoimentos, dados de secretarias ou métricas de ganho de tempo.

## Product Principles
1. O servidor descreve o processo do seu jeito; a ferramenta traduz para BPMN.
2. A IA propõe, o humano decide: nenhuma versão vira final sem aprovação do chefe do setor.
3. Cada versão aprovada é rastreável, com motivo e histórico.
4. Exportar e editar em ferramentas padrão (BPMN, PDF) não deve ser bloqueado pela aplicação.

## Accessibility & Inclusion
Usuários são servidores públicos de perfis técnicos variados, com pouca familiaridade com BPMN. Linguagem de interface sem jargão de modelagem e fluxos de validação claros são requisitos. Padrão de acessibilidade formal ainda não definido.
