# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (responsiva, desktop e mobile)

## Users
- **Mapeador (servidor público):** pessoa que conhece o processo do seu setor, mas não domina BPMN. Faz o mapeamento respondendo a uma entrevista em formato de chat, revisa e ajusta o diagrama gerado e o envia para validação. Job: descrever o processo real do setor sem precisar aprender a técnica.
- **Chefe do setor (validador):** confere o mapeamento dos setores que chefia e aprova ou devolve com comentário. Também pode mapear. Job: aprovar o processo do setor ou pedir correção.
- **Administrador:** define o setor de cada usuário e o chefe de cada setor, pelo Django Admin no MVP.

## Product Purpose
Plataforma para mapeamento de processos em secretarias públicas (projeto FluxoIA, UFPI, para a SECTI). Hoje o mapeamento é manual, leva meses e depende de poucas pessoas que dominam a técnica. O produto deve reduzir esse tempo e tornar o trabalho acessível a quem executa o processo. Sucesso: um mapeamento aprovado em BPMN, com registro de quem gerou, quem aprovou ou devolveu e quando.

## Positioning
A IA propõe o diagrama a partir de uma entrevista guiada, e o servidor nunca precisa conhecer BPMN. A IA não tem poder de decisão: todo mapeamento passa pela aprovação do chefe do setor antes de ser considerado final.

## Operating Context
- Fluxo de uso: cadastro → aguarda o administrador definir o setor → login → dashboard com menu lateral → passo a passo de uso → entrevista em chat com roteiro fixo → geração do diagrama e do resumo pela IA → ajustes no editor → envio ao chefe do setor → aprovação ou devolução → lista de mapeamentos → exportação em PDF ou BPMN → logout.
- Ciclo de validação:
  - O chefe do setor aprova ou devolve com comentário obrigatório.
  - Se devolvido, o mapeador corrige manualmente no editor integrado e reenvia; o mapeamento volta direto para validação.
  - Aprovado é imutável; edições posteriores são feitas em ferramenta externa, a partir do `.bpmn` exportado.
- Ambiente: servidores de secretarias públicas, usando navegador em computador de trabalho ou celular.

## Capabilities and Constraints
- Entrevista em formato de chat com 14 perguntas fixas, sem IA durante a conversa. Respostas salvas a cada envio, editáveis até a geração e consultáveis depois pelo autor.
- Geração do diagrama pela IA: as respostas viram um fluxo em formato intermediário (JSON) e o sistema o converte em BPMN 2.0, com uma raia por setor. A IA também gera um resumo do processo (objetivo, entradas, saídas e responsáveis).
- Editor BPMN embutido (bpmn-js, recursos padrão) para ajustar o diagrama antes do envio e corrigir mapeamentos devolvidos.
- Exportação em PDF (gerado no backend com WeasyPrint) e BPMN, em qualquer status; o PDF de um mapeamento não aprovado traz marca d'água.
- A aprovação registra aprovador e data. Não há versionamento no MVP.
- Textos das entrevistas podem ser enviados a provedor externo de IA, por meio do LiteLLM Proxy hospedado na VPS, que também acompanha o gasto.
- Stack já definida pelo repositório: backend em Django REST (`backend/`) e frontend em React + Vite + TypeScript + Tailwind + shadcn (`frontend/`). Autenticação JWT já implementada no backend.
- Terminologia: "mapeamento" (processo mapeado em BPMN), "mapeador", "chefe do setor".
- Fora do MVP: análise prévia das respostas pela IA, versionamento, campo "norma", painel de propriedades e comentários no diagrama, retenção automática de dados.
- Em aberto: logotipos oficiais do PDF e modelos reais por trás dos aliases do LiteLLM.

## Brand Commitments
Nome: FluxoIA. Projeto acadêmico (UFPI) com parceria da SECTI; sem identidade visual institucional definida até o momento. Os logotipos oficiais no PDF ficam como espaço reservado até o product owner enviá-los.

## Evidence on Hand
- README do repositório com problema, proposta e equipe.
- Requisitos em `docs/requisitos.md` e plano do MVP em `docs/analise-mvp.md`.
- Demonstração existente (mockup): https://luisfelipe114.github.io/fluxoia-mockup/
- `FLUXOGRAMAS - AAD e CEU.pdf`: fluxogramas reais da Coordenação Especial de Urbanismo, usados como modelo de processo. Contém nomes de servidores, por isso fica fora do git.
- Gabaritos em `eda_corpus/data/gabarito/`: os fluxogramas 2.1 a 2.5 estruturados em JSON (setores, elementos e fluxos), base do formato intermediário da IA.
- Roteiro de entrevista adaptado (Anexo A de `docs/requisitos.md`).
- Não há entrevistas reais com servidores. Não inventar depoimentos, dados de secretarias ou métricas de ganho de tempo.

## Product Principles
1. O servidor descreve o processo do seu jeito; a ferramenta traduz para BPMN.
2. A IA propõe, o humano decide: nenhum mapeamento vira final sem aprovação do chefe do setor.
3. Cada mapeamento aprovado é rastreável: quem gerou, quem aprovou ou devolveu, quando e com quais comentários.
4. Exportar e editar em ferramentas padrão (BPMN, PDF) não deve ser bloqueado pela aplicação.

## Accessibility & Inclusion
Usuários são servidores públicos de perfis técnicos variados, com pouca familiaridade com BPMN. Linguagem de interface sem jargão de modelagem, inclusive nas perguntas da entrevista, e fluxos de validação claros são requisitos. Padrão de acessibilidade formal ainda não definido.
