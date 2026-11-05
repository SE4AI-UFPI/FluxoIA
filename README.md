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

## Equipe

- Jaderson Emanuel da Rocha Costa (Engenharia de Dados)
- Luis Felipe Cabral Brito (Engenharia de Machine Learning)
- Anthony Rios Amorim e Micaias Carvalho Vieira (Engenharia de Software)

Orientação: Prof. Guilherme Avelino, UFPI.
