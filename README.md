# FluxoIA

Ferramenta para ajudar servidores públicos a **mapear processos**. O servidor responde a uma entrevista guiada, a IA propõe o diagrama BPMN, e o chefe do setor revisa e aprova.

Projeto da disciplina de Tópicos Avançados em Computação Inteligente (UFPI) para a SECTI.

**Demonstração:** https://luisfelipe114.github.io/fluxoia-mockup/

## Problema

Nas secretarias, o mapeamento de processos é manual, leva meses e depende de poucas pessoas que dominam a técnica. O FluxoIA quer deixar esse trabalho mais rápido e mais simples, sem exigir que o servidor conheça BPMN.

## Proposta

1. O servidor responde a uma entrevista guiada sobre o processo do seu setor.
2. A IA monta o fluxo (setores, etapas, decisões) e o sistema o converte em BPMN.
3. O servidor revisa, edita no diagrama ou pede ajustes por texto.
4. O chefe do setor confere e aprova ou devolve. Cada aprovação vira uma versão guardada, com motivo e norma.
5. O resultado sai em `.bpmn` (editável) e PDF.

A IA não tem poder de decisão.

## Status

Fase de viabilidade e concepção. Próximas etapas: prova de conceito do componente de IA e desenvolvimento do MVP.

## Equipe

- Jaderson Emanuel da Rocha Costa (Engenharia de Dados)
- Luis Felipe Cabral Brito (Engenharia de Machine Learning)
- Anthony Rios Amorim e Micaias Carvalho Vieira (Engenharia de Software)

Orientação: Prof. Guilherme Avelino, UFPI.
