# Runbooks Operacionais — FluxoIA

Conjunto de procedimentos operacionais padrão (`RB-01` a `RB-10`) derivados da **Especificação Técnica e Pacote de Transição para Operação (Fase V, Seção V.3)**.

Todos os comandos assumem execução na **raiz do projeto no servidor** (ex.: `/var/www/fluxoia`), com Docker e Docker Compose ativos.

## Índice

| Código | Título | Quando usar | Arquivo |
| :--- | :--- | :--- | :--- |
| **RB-01** | Subir, parar e reiniciar | Rotina diária, reinício após ajuste ou indisponibilidade de serviço | [RB-01-subir-parar-reiniciar.md](./RB-01-subir-parar-reiniciar.md) |
| **RB-02** | Backup e restauração | Backup diário automatizado, pré-deploy e recuperação (RPO 24h / RTO 4h úteis) | [RB-02-backup-e-restauracao.md](./RB-02-backup-e-restauracao.md) |
| **RB-03** | Trocar ou ativar fallback de modelo | Lentidão (> 120s), falha do provedor principal ou troca de modelo | [RB-03-trocar-ou-ativar-fallback-modelo.md](./RB-03-trocar-ou-ativar-fallback-modelo.md) |
| **RB-04** | Rotacionar chave do provedor | Expiração, suspeita de vazamento ou erro 401 na API do LLM | [RB-04-rotacionar-chave-provedor.md](./RB-04-rotacionar-chave-provedor.md) |
| **RB-05** | Erro 401/429 do modelo | Falha de autenticação (401) ou falta de saldo / rate limit (429) no LiteLLM | [RB-05-erro-401-429-modelo.md](./RB-05-erro-401-429-modelo.md) |
| **RB-06** | Geração rejeitada pelo esquema | Erro de parsing JSON, Pydantic ou regras estruturais na geração BPMN | [RB-06-geracao-rejeitada-esquema.md](./RB-06-geracao-rejeitada-esquema.md) |
| **RB-07** | Processo não aparece na fila do Supervisor | Autor submeteu o processo, mas Supervisor não o visualiza em `/governanca` | [RB-07-processo-nao-aparece-fila-supervisor.md](./RB-07-processo-nao-aparece-fila-supervisor.md) |
| **RB-08** | Atualizar versão | Implantação de nova release/tag (ex.: `v1.1.0`), smoke test e rollback | [RB-08-atualizar-versao.md](./RB-08-atualizar-versao.md) |
| **RB-09** | Gestão de usuários | Criação, vinculação de setores e inativação lógica (soft delete) | [RB-09-gestao-de-usuarios.md](./RB-09-gestao-de-usuarios.md) |
| **RB-10** | Rodar o benchmark | Avaliação no golden set após mudança de prompt/modelo ou rotina trimestral | [RB-10-rodar-benchmark.md](./RB-10-rodar-benchmark.md) |
