# Planejamento da administração do FluxoIA

Data: 06/11/2026. Branch de referência: `feat/administracao`. Base examinada: `14925ff`.

Este documento planeja a implementação. Nenhum dos commits C01–C30 abaixo foi executado por este planejamento. Os títulos são sugestões de mensagens de commit e as caixas servem para acompanhar a execução.

## 1. Objetivo e limites

Completar a administração em entregas pequenas que possam ser revisadas, testadas e demonstradas separadamente: acesso, usuários, estrutura institucional, recuperação de acesso, auditoria, painel e governança de processos.

O pedido atual inclui telas administrativas próprias. Os documentos [requisitos.md](requisitos.md), versão 0.6, e [analise-mvp.md](analise-mvp.md) preveem Django Admin no MVP e telas React apenas depois. Por isso, este plano distingue:

- **Base para o MVP:** administração pelo Django Admin, usuários com setor definido, chefia explícita, autorização no servidor, auditoria e aprovação/devolução.
- **Expansão administrativa:** listagem e manutenção em React, secretarias como cadastro próprio, recuperação de acesso e painel administrativo.
- **Extensão do produto:** homologação e publicação. Não entram automaticamente no MVP nem equivalem a assinatura digital.

O plano não atribui prazo à expansão nem altera a entrega de 10/11/2026 registrada nos requisitos. A ordem abaixo é técnica; não significa que todas as partes caibam antes dessa data. O primeiro commit de execução deve registrar a conciliação de escopo, sem apagar o histórico dos requisitos.

## 2. Ponto de partida confirmado no código

| Área | Já existe nesta branch | Trabalho restante |
|---|---|---|
| Usuários | CRUD em `/api/usuarios/`, filtros simples, validação de CPF, cadastro React e restrição admin/próprio usuário | Busca, paginação, telas de listagem/edição, regras de desativação/exclusão, proteção do último administrador e auditoria |
| Perfis | Quatro perfis em Python e TypeScript; migração `0002` converte os antigos | Conciliar os perfis com a chefia definida nos requisitos; centralizar a política de autorização |
| Cadastro público | `/api/auth/register/` | Hoje aceita `supervisor`, `coordenador` e dados de lotação; deve aceitar só nome, e-mail e senha |
| Navegação | Menu do admin já inclui todas as permissões de menu; rota de mapeamento verifica `processes:create` | Evitar divergência entre menu, URL e API; tratar funcionalidades sem tela |
| Lotação | Secretaria/setor como texto; setores vinculados em JSON | Modelos institucionais, vínculos por ID, chefe por setor e migração dos dados |
| Processos | `Processo`, entrevista, versões BPMN, feedback e revisão persistidos; geração por IA; frontend consome a API | Endurecer autorização, privacidade, transições e tratamento de falhas |
| Governança | `POST /api/processos/{id}/revisar/` e `RevisaoGovernanca` | Chefia explícita, fila e telas, comentário obrigatório, concorrência e imutabilidade |
| Sessão | JWT e endpoint de refresh; `apiClient` para parte das chamadas | Revogação, renovação automática e tratamento uniforme de erros |
| Django Admin | Modelo customizado deriva de `AbstractBaseUser`; app e rota do admin não estão habilitados | Compatibilidade do usuário, formulários, registros, rota e estáticos no deploy |
| Auditoria | Autoria e datas em algumas entidades | Trilha de eventos administrativos e consulta controlada |
| Verificação | `test_users_auth.py`, `test_processes.py`, scripts frontend de build e lint | Casos de segurança, migração, concorrência e fluxos administrativos |

Referências principais: `backend/core/{models,serializers,permissions,views,urls}.py`, `backend/core/services/{user_service,process_service}.py`, `frontend/src/App.tsx`, `frontend/src/features/navigation/permissions.config.ts` e `frontend/src/services/{apiClient,authService,usersService}.ts`.

### Divergências que afetam o plano

1. O README e a seção de estado atual de `analise-mvp.md` ficaram atrás do código: persistência, IA e revisão já existem. Não reconstruí-las.
2. Os requisitos definem um setor principal por usuário e chefia por setor. O código usa papel e listas de nomes para conceder escopo. Um título de supervisor não deve, sozinho, autorizar revisão de qualquer setor.
3. `listar_processos` permite que usuários comuns vejam processos de colegas do mesmo setor; o serializer inclui a entrevista. Isso diverge de RN-08 e RN-10: processo para autor/chefe e entrevista somente para autor.
4. O CRUD de processos usa o mesmo conjunto visível para alterações; visibilidade não pode equivaler a permissão de editar, excluir ou gerar uma nova versão.
5. `status` é gravável no serializer de processos e a revisão não impõe todo o ciclo de vida. Não permitir aprovação ou publicação por `PATCH` genérico.
6. As permissões complementares atualmente substituem as permissões básicas quando a lista está preenchida, apesar do nome “complementares”. Essa semântica precisa ser explícita antes de ampliar seu uso.
7. O nginx encaminha `/api/`, mas não `/admin/`. Habilitar Django Admin apenas no Django não o torna acessível no ambiente Docker.

## 3. Premissas propostas para execução

Estas são decisões propostas, a formalizar em C01. Mudanças posteriores devem ser registradas no mesmo documento de decisão e refletidas nos testes.

| Tema | Proposta |
|---|---|
| Perfis existentes | Preservar os quatro valores atuais para compatibilidade. Não recriar `servidor` e `validador`. Separar papel administrativo de vínculo de chefia. Simplificar/remover perfis no futuro exige outra decisão e migração. |
| Chefia | Um chefe ativo para cada setor ativo; um usuário pode chefiar vários setores. Chefia é um vínculo explícito, não uma inferência do texto de `setores_vinculados`. Setor incompleto pode existir como inativo. |
| Lotação | Um setor principal por usuário; `null` significa aguardando liberação. Secretaria é derivada do setor. Usuário sem setor não mapeia, inclusive admin; a administração continua acessível ao admin. |
| Escopo do administrador | Gerenciar usuários e estrutura institucional. Isso não concede automaticamente acesso ao texto das entrevistas nem aprovação de processos alheios. Seguir RN-08/RN-10; se houver necessidade de acesso institucional ao conteúdo, decidir e documentar antes de ampliá-lo. |
| Permissões extras | Manter o nome de compatibilidade, mas adotar concessões adicionais às capacidades básicas. Elas nunca ampliam o escopo de setor nem substituem o vínculo de chefia. Não anunciar ações ainda sem implementação. |
| Autocadastro | Só nome, e-mail e senha; perfil operacional, sem lotação. Campos de privilégio enviados pelo cliente são ignorados, conforme US-01, e nunca persistidos. |
| Desativação | Preferir desativar a excluir. Bloquear autodesativação, remoção/rebaixamento do último admin ativo e desativação de chefe sem substituto. |
| Exclusão | Restrita a contas sem processos, revisões, chefias ou registros históricos que exijam preservação. Bloquear autoexclusão. Relações protegidas retornam erro de negócio; não realizar exclusão em cascata de processos. |
| Troca de setor | Bloquear a troca do setor principal se o usuário já tiver processos, como definido no escopo do MVP. Troca de chefe é permitida e auditada, com efeito imediato no acesso. |
| Publicação | Evolução opcional após aprovação; não significa acesso público, indexação ou remoção das regras de privacidade. Homologação separada exige uma regra de negócio própria. |
| Interface | Reaproveitar componentes e identidade visual existentes. Uma operação negada pela API continua negada com URL direta, requisição manual ou menu manipulado. |

## 4. Como revisar cada commit

Cada item abaixo representa **um commit pretendido**. Se o diff acumular duas mudanças independentes, subdividi-lo mantendo o ID do plano, por exemplo `C09a` e `C09b`. Não juntar refatorações sem relação com o comportamento entregue.

Para cada commit, registrar na descrição:

1. **Antes/depois:** qual comportamento mudou e por quê.
2. **Escopo:** arquivos principais, migrações e contrato da API afetado.
3. **Evidência:** comando executado e resultado; para tela, roteiro manual e captura sem dados reais.
4. **Compatibilidade:** quais consumidores continuam funcionando e como reverter.
5. **Rastreio:** ID deste plano e requisito associado; atualizar a caixa somente após a verificação.

Os testes de uma regra acompanham o commit da regra. Não adiar testes de acesso para a última parte. Um commit pode depender dos anteriores sem ser implantável isoladamente; as janelas de implantação estão na seção 7.

## 5. Partes e commits

### Parte 1 — Fechar o contrato e corrigir o acesso

**Resultado:** autocadastro sem privilégios e API aplicando acesso por ação. Não depende de telas administrativas novas.

#### [ ] C01 — `docs(admin): define contrato de acesso e escopo administrativo`

- **Entrega:** documento de decisão com matriz ator × ação × escopo, relação entre quatro papéis e chefia, semântica das permissões extras e itens MVP/expansão. Atualizar as referências em `docs/requisitos.md`, `docs/analise-mvp.md` e README quando houver mudança de escopo.
- **Arquivos previstos:** `docs/decisoes/administracao.md` e documentação existente.
- **Auditoria:** localizar uma regra explícita para cadastro público, liberação, chefia, leitura de entrevista, último admin, exclusão, troca de setor e publicação. Nenhuma ampliação de privilégio deve ficar implícita.
- **Depende de:** este planejamento. **Requisitos:** RF-01–08, RF-39–40, RN-05–12.

#### [ ] C02 — `fix(auth): restringe autocadastro e bloqueia mapeamento sem lotacao`

- **Entrega:** restringir `RegisterSerializer`; criar conta operacional sem setor; permitir perfil pendente sem quebrar `/auth/me/`; aplicar bloqueio no backend de processos e mostrar tela de aguardando liberação no frontend. Retirar o setor institucional fictício usado como fallback para liberar um novo mapeamento.
- **Arquivos previstos:** serializers, permissões, views, `App.tsx`, contexto de autenticação, nova página de liberação e hook do assistente.
- **Auditoria:** enviar `papel=admin`, `papel=supervisor`, setor e permissões no cadastro e confirmar que não foram concedidos. Novo usuário faz login, consulta sessão e sai, mas não lista/cria/altera processos. Admin sem setor continua gerindo usuários.
- **Depende de:** C01. **Requisitos:** RF-01–03, RF-39, US-01–02, RN-05.

#### [ ] C03 — `fix(authz): separa leitura escrita e revisao de processos`

- **Entrega:** centralizar verificações por ação; limitar alteração/geração/submissão ao autor e revisão ao escopo autorizado; impedir consulta por colegas e exposição da entrevista a não autores. Retirar de `PATCH` genérico campos controlados pelo ciclo de vida e bloquear alterações em aprovado. Enquanto os vínculos por ID não existirem, encapsular a compatibilidade por setor legado e documentar sua remoção em C11.
- **Arquivos previstos:** módulo de política em `core`, `permissions.py`, serializers, views, `process_service.py`, testes e adaptação das chamadas frontend que hoje enviam status arbitrário.
- **Auditoria:** autor A, colega B, supervisor de outro setor e administrador sem chefia; conferir lista, detalhe, escrita, versão, geração, submissão, revisão e exclusão. Enviar um UUID de versão de outro processo e confirmar rejeição. Atualizar testes antigos que aprovavam diretamente um rascunho.
- **Depende de:** C01–C02. **Requisitos:** RF-31, RF-37, RN-02–03, RN-08–10, RN-12–13.

### Parte 2 — Tornar a manutenção de usuários segura e auditável

**Resultado:** operações administrativas passam por serviços comuns, com histórico e uma interface Django Admin funcional.

#### [ ] C04 — `feat(audit): adiciona eventos administrativos transacionais`

- **Entrega:** modelo `EventoAuditoria`, migração e serviço explícito de registro. Guardar autor, ação, tipo/ID do objeto, data, motivo e alterações de campos permitidos. Autor pode ser nulo para recuperação pública; preservar identificadores necessários quando o objeto alvo for removido. O registro deve acompanhar a transação da alteração.
- **Arquivos previstos:** models, nova migração, `services/audit_service.py` e testes.
- **Auditoria:** rollback não deixa evento de sucesso; senhas, hashes, JWT, tokens de recuperação, CPF completo e texto da entrevista não entram no evento. Não existir endpoint de edição/exclusão da trilha. Proteção é da aplicação; não prometer inviolabilidade contra um administrador do banco.
- **Depende de:** C01. **Relação:** auditoria administrativa; base para RF-36–37.

#### [ ] C05 — `fix(users): protege ciclo de vida e ultimo administrador`

- **Entrega:** concentrar criação, atualização, ativação/desativação e exclusão em serviços transacionais com eventos; exigir motivo para mudanças de situação e exclusão. Proteger autoexclusão/autodesativação, último admin e contas com dependências. Tratar `ProtectedError` como conflito de negócio, não erro 500; validar `is_active` estritamente. Invalidar acesso de conta inativa; C16 acrescentará revogação permanente dos tokens antigos.
- **Arquivos previstos:** `user_service.py`, serializers, permissões, views e testes.
- **Auditoria:** tentar dois rebaixamentos concorrentes dos últimos admins em PostgreSQL; ao menos um admin permanece ativo. Usuário com processo/revisão não pode ser excluído. Dados inválidos não geram evento de alteração nem alteração parcial.
- **Depende de:** C03–C04. **Relação:** gestão de usuários e preservação do histórico.

#### [ ] C06 — `feat(admin): habilita administracao Django para usuarios`

- **Entrega:** tornar o usuário customizado compatível com o admin (`is_staff`, `is_superuser`/mecanismo de permissões e formulários de senha); sincronizar a autoridade administrativa com `papel=admin`, sem criar outro caminho de privilégio. Migrar admins existentes e ajustar `createsuperuser`. Habilitar app, rota, registro de usuários e consultas de auditoria somente leitura. Alterações pelo admin devem usar as mesmas regras e eventos de C05.
- **Arquivos previstos:** models, manager, migração, `core/admin.py`, formulários, settings/URLs, Docker e nginx para `/admin/` e estáticos.
- **Auditoria:** superusuário novo e admin existente entram; usuário comum não entra; senha nunca é salva em texto; ações individuais e em lote não contornam C05. O admin abre com CSS no Docker e mantém CSRF/sessão corretamente configurados.
- **Depende de:** C04–C05. **Requisitos:** RF-04 e RF-10.

### Parte 3 — Cadastrar secretarias, setores e chefias por ID

**Resultado:** os acessos deixam de depender de nomes digitados. Migração em expansão → preenchimento → troca de leitura, com compatibilidade explícita.

#### [ ] C07 — `feat(org): adiciona estrutura institucional e vinculos opcionais`

- **Entrega:** criar `Secretaria` e `Setor` com nome, situação ativa e relação entre eles; acrescentar chefe ao setor e referências opcionais de setor em usuário/processo. Preservar campos textuais durante a transição. Proteger entidades referenciadas contra exclusão; impedir nomes duplicados no mesmo escopo segundo regra de normalização de C01.
- **Arquivos previstos:** models, migrações de esquema e testes de restrições.
- **Auditoria:** migrar banco novo e banco com dados; campos legados permanecem intactos. Dois setores podem ter o mesmo nome em secretarias diferentes sem serem o mesmo setor. Não modificar migrações antigas já publicadas.
- **Depende de:** C01 e C06. **Requisitos:** RF-06–08; secretaria como expansão.

#### [ ] C08 — `feat(org): prepara migracao conferivel dos setores legados`

- **Entrega:** comando de diagnóstico com `--dry-run` e aplicação explícita de um mapa de correspondência. Relacionar combinações secretaria/setor a IDs, apontar usuários sem lotação, duplicidades e chefias por definir. Preencher referências de forma idempotente; não inferir chefe a partir do papel nem unir nomes ambíguos automaticamente.
- **Arquivos previstos:** `core/management/commands/`, dados de teste e instruções de migração em `docs`.
- **Auditoria:** dry-run não escreve; executar aplicação duas vezes não duplica; ambiguidades produzem relatório/erro antes da troca de contrato. Inventário confere contagem de usuários, processos, versões, revisões e referências sem correspondência. Saída operacional não deve ir ao Git com dados pessoais.
- **Depende de:** C07. **Requisitos:** RF-06–08, RF-40, RN-12.

#### [ ] C09 — `feat(org): expoe manutencao institucional e designacao de chefias`

- **Entrega:** API administrativa de secretarias/setores, com listagem paginada, edição, ativação/desativação e troca de chefe; registrar modelos no Django Admin. Vínculo com chefe ativo obrigatório para ativar setor; impedir desativação de secretaria/setor com pendências ou vínculos ativos sem regularização. Troca de setor do usuário obedece à restrição de processos existentes.
- **Arquivos previstos:** serializers, URLs/views de organização, `services/organization_service.py`, admin e testes. Leituras para seletores devem retornar somente o necessário ao escopo do solicitante.
- **Auditoria:** não admin não altera estrutura; chefe inativo não pode ser designado; usuário não pode forjar setor por nome; chefia trocada gera evento com antes/depois. Ações no Django Admin e na API produzem o mesmo resultado.
- **Depende de:** C04–C08. **Requisitos:** RF-05–08 e RF-40.

#### [ ] C10 — `feat(org-ui): usa seletores institucionais e contratos por id`

- **Entrega:** adicionar `setor_id`, `setor_nome`, `secretaria_id` e `secretaria_nome` ao contrato de forma aditiva; atualizar cadastro e assistente para usar seletores autorizados. Criar manutenção React de secretarias/setores e designação de chefe. Campos legados continuam apenas para leitores em transição, sem permitir concessão de acesso por texto. Se as duas telas gerarem diff grande, separar C10a/C10b.
- **Arquivos previstos:** serviços e tipos frontend, formulários existentes, novas páginas institucionais, rotas/menu e serializers de compatibilidade.
- **Auditoria:** escolher setor identifica a secretaria correta; setores homônimos não se confundem; IDs inválidos/inativos retornam erro legível; nenhuma tela usa a lista fictícia de setores do assistente. Verificar URL direta sem autorização.
- **Depende de:** C09. **Requisitos:** RF-05–08; telas React como expansão.

#### [ ] C11 — `fix(authz): usa vinculos institucionais como fonte de escopo`

- **Entrega:** passar leituras e autorização para os IDs; derivar `setores_chefiados` do vínculo em `Setor`; parar de conceder acesso por papel de supervisor ou JSON de nomes. Criar processo no setor principal e fixá-lo após criação. Expor capacidades efetivas em `/auth/me/` para orientar menu/rotas pela política de C01, sem dispensar a verificação de cada ação no servidor. Concessões extras não expandem escopo. Exibir apenas ações implementadas.
- **Arquivos previstos:** política backend, serviços, serializers de sessão, tipos/contexto frontend, permissões de navegação e migrações de validação necessárias.
- **Auditoria:** mudar o chefe transfere a fila e o histórico imediatamente; o anterior mantém só eventual acesso como autor. Um admin sem chefia não ganha conteúdo de entrevistas alheias. Alterar permissões extras não torna alguém chefe. Qualquer vínculo legado sem resolução bloqueia o corte, sem ser descartado.
- **Depende de:** C03 e C08–C10. **Requisitos:** RF-40, RN-03, RN-07–12.

### Parte 4 — Completar a gestão de usuários em React

**Resultado:** o administrador localiza, consulta e mantém usuários sem depender da tela de cadastro.

#### [ ] C12 — `feat(users-api): adiciona busca ordenacao e paginacao`

- **Entrega:** busca por nome/e-mail/matrícula, filtros por IDs institucionais/perfil/situação e ordenação estável com desempate. Paginação limitada ao endpoint de usuários para não alterar silenciosamente processos/perguntas. Fixar envelope `count`, `next`, `previous`, `results` e documentar migração do retorno em lista.
- **Arquivos previstos:** queryset/serviço, view/paginação, documentação do contrato e testes de usuários.
- **Auditoria:** filtros combinados; nome com acento; primeira/última página; parâmetro inválido; não admin continua vendo apenas o próprio registro. Listagem não retorna senha nem mais dados pessoais que os necessários.
- **Depende de:** C05 e C11. **Relação:** RF-04 ampliado para React.

#### [ ] C13 — `feat(users-ui): adiciona listagem administrativa de usuarios`

- **Entrega:** `/usuarios` com busca, filtros, paginação, total, estados de carregamento/erro/vazio e atalho de cadastro. Atualizar `usersService` para listagem/detalhe e menu para “Usuários”. Preservar `/usuarios/novo`.
- **Arquivos previstos:** nova página de listagem, serviço, rotas e menu. Acrescentar apenas a infraestrutura de teste frontend necessária aos fluxos críticos e mantê-la nos commits seguintes.
- **Auditoria:** filtro/página permanecem na URL; resposta atrasada de busca antiga não sobrescreve a nova; usuário comum não abre a página por URL. Conferir teclado, celular e recuperação após falha da API.
- **Depende de:** C12. **Relação:** gestão administrativa em React.

#### [ ] C14 — `feat(users-ui): adiciona detalhe e edicao de usuarios`

- **Entrega:** `/usuarios/:id/editar`; reaproveitar campos do cadastro sem tornar senha obrigatória na edição; mostrar erros por campo e limpar permissões incompatíveis ao trocar perfil. ID inexistente não deve abrir formulário de criação. Rascunhos são separados por administrador/usuário alvo e nunca guardam senha.
- **Arquivos previstos:** formulário compartilhado, página de edição, serviço/tipos e rotas.
- **Auditoria:** editar telefone não altera perfil/lotação; recarregar busca dados da API; CPF/e-mail duplicados aparecem no campo certo; troca de setor com processos é bloqueada e explicada; outro usuário não lê rascunho administrativo ao trocar sessão no mesmo navegador.
- **Depende de:** C10 e C13.

#### [ ] C15 — `feat(users-ui): adiciona ativacao e exclusao com regras de negocio`

- **Entrega:** ações de ativar/desativar e exclusão restrita, identificando nome/e-mail e consequência antes da ação. Exigir motivo administrativo; evitar disparo duplo; atualizar listagem após resposta da API. Exibir dependências e conflitos retornados pelo servidor.
- **Arquivos previstos:** ações na listagem/detalhe, componentes de confirmação e métodos de serviço.
- **Auditoria:** cancelar não envia requisição; último admin, próprio usuário e conta com histórico não podem ser removidos indevidamente. Conta desativada não autentica nem usa token de acesso enquanto inativa. Mesmo teste pela API deve produzir a mesma negativa.
- **Depende de:** C05 e C14.

### Parte 5 — Sessão e recuperação de acesso

**Resultado:** credenciais revogáveis e recuperação sem o administrador conhecer a nova senha.

#### [ ] C16 — `feat(auth): revoga sessoes apos alteracoes de credenciais`

- **Entrega:** mecanismo de versão de sessão/token verificado no acesso e no refresh. Invalidar tokens anteriores após desativação, redefinição ou troca de senha; reativar conta não ressuscita tokens antigos. Autorizações por perfil/chefia consultam o banco, não claims antigas. Definir transição para JWT já emitidos e alinhar sessões do Django Admin.
- **Arquivos previstos:** usuário/migração, autenticação JWT, serializers de token, serviços de senha/usuários e testes com tokens reais.
- **Auditoria:** access e refresh antigos falham após revogação, inclusive depois de reativar a conta. Login novo funciona quando permitido. Validar também sessão do Django Admin, sem depender só de `force_authenticate` nos testes.
- **Depende de:** C05–C06 e C11.

#### [ ] C17 — `feat(auth-ui): unifica cliente http e renovacao da sessao`

- **Entrega:** centralizar chamadas autenticadas em `apiClient`; renovar uma vez em 401 e compartilhar a renovação entre requisições concorrentes. Repetir requisição apenas após falha de autenticação, sem repetir mutação por timeout/erro de rede. Tratar 403 como acesso negado e falha de rede como indisponibilidade, sem apagar a sessão automaticamente.
- **Arquivos previstos:** `apiClient.ts`, `authService.ts`, `usersService.ts`, serviços institucionais, contexto e armazenamento de tokens desacoplado para evitar dependência circular.
- **Auditoria:** várias chamadas com access expirado fazem um único refresh; refresh inválido encerra sessão uma vez; 403 não causa loop; logout durante refresh não restaura a conta; formulário preserva dados em falha de rede.
- **Depende de:** C11 e C16. Pode ser antecipado antes das novas telas de usuários, que então já utilizam o cliente unificado.

#### [ ] C18 — `feat(auth): implementa recuperacao de senha por token temporario`

- **Entrega:** endpoints para solicitar e confirmar recuperação com validade, uso único e política de senha; resposta pública uniforme para e-mail existente/inexistente/inativo; limitação de tentativas. Reset administrativo usa envio de link pelo mesmo serviço e registra o solicitante. Não enviar senha por e-mail nem retornar token na API.
- **Arquivos previstos:** serviço/serializers/views de recuperação, template de e-mail, configuração de e-mail em settings e `.env.example`, Docker e testes. Base da URL do link vem de configuração confiável.
- **Auditoria:** token expirado, reutilizado ou adulterado falha; senha fraca falha sem consumir uma operação válida; sucesso revoga JWT antigos via C16. Usar backend de e-mail em memória nos testes e serviço de captura local na demonstração. Entrega real depende de configurar e validar SMTP, sem chamar o fluxo completo antes disso.
- **Depende de:** C04, C16–C17.

#### [ ] C19 — `feat(auth-ui): adiciona recuperacao e redefinicao de senha`

- **Entrega:** “Esqueci minha senha”, página de definição da nova senha e ação administrativa de enviar recuperação. Mensagens neutras e instrução de retorno ao login. Após consumir o link, removê-lo da URL; não armazenar token/senha em rascunhos ou logs.
- **Arquivos previstos:** páginas públicas de recuperação, login, detalhe de usuário e serviços.
- **Auditoria:** percorrer o fluxo com caixa de e-mail de teste; repetir link e verificar recusa; mostrar estado expirado sem perder orientação. Conta inexistente produz a mesma mensagem pública.
- **Depende de:** C18.

### Parte 6 — Consultar auditoria e operar com dados reais

**Resultado:** o administrador entende as alterações realizadas e vê pendências que exigem ação.

#### [ ] C20 — `feat(audit-api): adiciona consulta filtrada de eventos`

- **Entrega:** API administrativa somente leitura com paginação, filtros por autor, ação, objeto e período, ordenação estável e limites de consulta. Separar eventos administrativos dos eventos de processo: estes seguem autor/chefe e não expõem entrevista. Não criar retenção/exclusão automática nesta entrega.
- **Arquivos previstos:** serializers de leitura, serviço de consulta, URLs/views e testes de escopo e dados sensíveis.
- **Auditoria:** conferir eventos conhecidos; não admin não consulta trilha administrativa; não existe POST/PATCH/DELETE; filtros não revelam conteúdo de processo fora do escopo. Eventos antigos nunca são atribuídos retroativamente a uma pessoa sem evidência.
- **Depende de:** C04, C11 e C16–C18.

#### [ ] C21 — `feat(audit-ui): adiciona consulta administrativa de auditoria`

- **Entrega:** `/administracao/auditoria` com filtros, data/hora, responsável, motivo e alterações permitidas. Links ao objeto somente quando ainda existe e o usuário pode acessá-lo; exclusão deve continuar compreensível pelo identificador preservado.
- **Arquivos previstos:** página/serviço de auditoria, rotas e menu.
- **Auditoria:** alterar usuário e chefe, depois localizar ambos os eventos; confirmar valores antes/depois sem CPF completo, senha ou token; URL direta sem privilégio é negada.
- **Depende de:** C17 e C20.

#### [ ] C22 — `feat(admin-api): fornece indicadores operacionais da administracao`

- **Entrega:** endpoint de resumo administrativo com total de usuários, ativos/inativos, aguardando lotação e setores sem regularização. Indicadores de processo são calculados somente no escopo autorizado; separar os dois conjuntos. Totais institucionais de processos exigem decisão explícita em C01 antes de serem expostos.
- **Arquivos previstos:** serviço de agregações, endpoint/serializer e testes.
- **Auditoria:** preparar base com quantidades conhecidas e conferir cada contador, incluindo zeros. Não obter totais carregando todas as entrevistas/versões. Usuário comum não acessa métricas de administração nem infere processos de outros setores.
- **Depende de:** C09, C11 e C12.

#### [ ] C23 — `feat(admin-ui): substitui painel provisorio por resumo administrativo`

- **Entrega:** painel do admin com dados de C22 e atalhos para usuários sem lotação, estrutura institucional e auditoria. Preservar dashboards dos outros perfis; não inserir números de demonstração para disfarçar endpoint ausente. Mostrar data de atualização e erro quando o resumo estiver indisponível.
- **Arquivos previstos:** página de dashboard administrativo, seletor de dashboard por perfil e serviço.
- **Auditoria:** criar, lotar e desativar um usuário e observar os contadores após atualização. Atalhos abrem filtros correspondentes; zero é distinguível de falha de carregamento.
- **Depende de:** C13, C17, C21–C22.

### Parte 7 — Completar a governança e separar a extensão de publicação

**Resultado principal:** chefe consulta sua fila, aprova ou devolve; o autor corrige e reenvia sem perder a entrevista. Reaproveitar os modelos/endpoints existentes.

#### [ ] C24 — `fix(governance): valida transicoes pareceres e concorrencia`

- **Entrega:** completar a máquina de estados iniciada em C03; revisão somente em `aguardando_validacao`, por chefe atual do setor; devolução exige comentário; submissão exige diagrama válido e congela a versão revisada. Proteger revisão/submissão simultâneas em transação com verificação da versão esperada e conflito legível. Associar eventos à versão e preservar devoluções. Novo chefe recebe pendências conforme C11.
- **Arquivos previstos:** serviço de governança/processos, serializers, ações de views e testes de transição/concorrência. Separar serializers de escrita por ação e não aceitar versão de outro processo.
- **Auditoria:** duas revisões concorrentes não produzem duas decisões válidas; devolução vazia falha; revisão de versão antiga retorna conflito; autor que também é chefe pode aprovar, conforme RN-09. `rejeitado` não vira atalho para reabrir aprovado; manter compatibilidade apenas se documentada em C01.
- **Depende de:** C03–C04, C11 e C16. **Requisitos:** RF-22–29, RF-31, RF-40, RN-02–03 e RN-06–13.

#### [ ] C25 — `feat(governance-ui): adiciona fila e revisao do chefe`

- **Entrega:** `/governanca` com busca/filtros/paginação e detalhe do processo; diagrama, informações permitidas e histórico de devoluções; ações aprovar/devolver com confirmação. Não mostrar entrevista para chefe que não é o autor. Se necessário, separar fila e detalhe em C25a/C25b.
- **Arquivos previstos:** páginas de governança, serviço, componentes de visualização existentes, rotas e menu.
- **Auditoria:** fila mostra somente setores chefiados; aprovar retira item da pendência; devolver exige parecer; conflito pede recarregar em vez de sobrescrever decisão. Conferir o mesmo objeto por URL direta sem acesso.
- **Depende de:** C17 e C24. **Requisitos:** RF-23–26, RF-29–30.

#### [ ] C26 — `fix(process-ui): preserva devolucao e reenvia sem refazer entrevista`

- **Entrega:** tratar `ajustes_solicitados` como devolução, não como reinício da entrevista; mostrar parecer, permitir correção do diagrama e reenviar. Não usar fallback silencioso para outro rascunho quando o ID solicitado falha. Atualizar a lista real após envio/revisão e preservar rascunho em erro de API. Registrar eventos de geração/envio/revisão na trilha de processos.
- **Arquivos previstos:** serviços/hook de processos, tipos/status, página de detalhe/assistente, editor existente e lista de processos. Acrescentar o editor mínimo necessário se ainda não permitir a correção prevista em RF-38; não redesenhar a entrevista nesta etapa.
- **Auditoria:** autor recebe devolução, corrige e reenvia o mesmo processo sem responder de novo; ao recarregar, API mantém comentário e estado. Aprovado permanece somente leitura. Histórico de entrevista não aparece para outro usuário.
- **Depende de:** C17 e C24–C25. **Requisitos:** RF-26–27, RF-31, RF-38, RN-02, RN-10 e RN-13.

#### [ ] C27 — `feat(publication-api): adiciona publicacao controlada de aprovados` — extensão

- **Condição de execução:** registrar em C01 uma extensão de escopo com responsável, público autorizado, efeito de publicar e regra de homologação. Sem essa definição, manter C27–C28 fora da entrega e retirar ações sem implementação do menu/cadastro. Não há bloqueio das partes anteriores.
- **Entrega proposta:** ação explícita `publicar`, só para aprovado, preservando a versão e registrando responsável/data/evento. Se homologação for uma decisão distinta da aprovação, criar etapa, evento e autorização próprios em subcommit separado; não implementar apenas um rótulo.
- **Arquivos previstos:** modelos/migrações de publicação, política, serviços, ação de API e testes.
- **Auditoria:** rascunho não publica; `PATCH status=publicado` não funciona; repetir publicação não duplica eventos; publicado continua protegido e imutável. Publicação não cria endpoint anônimo automaticamente.
- **Depende de:** C01, C20 e C24–C26. **Relação:** expansão além do MVP.

#### [ ] C28 — `feat(publication-ui): apresenta publicacao e rastreabilidade` — extensão

- **Entrega:** ação e estado de publicação no detalhe autorizado, responsável/data e histórico. Homologação aparece somente se C27 tiver implementado sua regra. Sem assinatura digital nesta entrega.
- **Arquivos previstos:** detalhe, badges de status, serviço de publicação e histórico.
- **Auditoria:** ação aparece só quando aplicável; refresh preserva estado; pessoa sem autorização não publica por botão nem por API; o diagrama publicado corresponde à versão aprovada.
- **Depende de:** C27. **Relação:** expansão além do MVP.

### Parte 8 — Encerrar a transição e deixar a entrega reproduzível

**Resultado:** contratos antigos removidos com evidência e um roteiro único para aceitar a administração.

#### [ ] C29 — `refactor(org): encerra compatibilidade com lotacao textual`

- **Entrega:** depois de todos os consumidores usarem IDs, remover campos/caminhos de escrita legados e a autorização temporária de C03; consolidar restrições finais. Retirar `setores_vinculados` como fonte de acesso e permissões de funcionalidades inexistentes. Preservar dados históricos em migração/registro apropriado e atualizar os contratos.
- **Arquivos previstos:** novas migrações, models, serializers, política, tipos/serviços frontend e documentação.
- **Auditoria:** relatório prévio com zero vínculo ambíguo; contagens/IDs de processos, versões e revisões permanecem; nenhuma string antiga concede acesso. Migração testada em cópia e rollback/restore documentado antes de remover dados.
- **Depende de:** C08–C11, C14, C24–C26; C28 somente se a extensão entrar. Não executar apenas por “limpeza” antes de comprovar uso do contrato novo.

#### [ ] C30 — `test(admin): consolida aceite e operacao da administracao`

- **Entrega:** roteiro executável de ponta a ponta, dados fictícios de demonstração e documentação de operação: criar admin, cadastrar estrutura, liberar conta, trocar chefe, recuperar acesso, consultar auditoria e lidar com último admin/contas protegidas. Corrigir README desatualizado. Verificar serviço de e-mail e admin no Docker. Se novas falhas exigirem correções, corrigi-las em commits próprios antes de fechar este item.
- **Arquivos previstos:** testes de integração/E2E onde agregarem cobertura, roteiro em `docs`, exemplos de configuração e README. Não colocar credenciais reais no repositório.
- **Auditoria:** executar a seção 8 com usuários distintos; anexar resultados e limitações. Restaurar backup de teste e confirmar funcionamento. Não declarar aprovado o fluxo de e-mail real se só o backend de testes tiver sido usado.
- **Depende de:** todos os itens incluídos na entrega; C27–C28 podem permanecer explicitamente adiados.

## 6. Ordem e pontos de auditoria por entrega

As dependências de cada commit prevalecem sobre a ordem numérica. Por exemplo, C24 pode ser antecipado depois de C16 para fechar a governança do MVP sem esperar as telas administrativas de expansão.

| Entrega auditável | Commits | O que demonstrar | Natureza |
|---|---|---|---|
| D1 — Acesso controlado | C01–C03 | Cadastro não escolhe privilégio; sem setor aguarda; API diferencia ler/editar/revisar | Base MVP |
| D2 — Administração utilizável | C04–C06 | Admin Django mantém usuários, preserva último admin e gera auditoria | Base MVP |
| D3 — Estrutura institucional | C07–C11 | Setores e chefias por ID; troca de chefe transfere fila; dados antigos conferidos | Base MVP, com secretarias/React como expansão |
| D4 — Gestão de usuários em React | C12–C15 | Buscar, editar, ativar/desativar e tratar exclusão protegida | Expansão |
| D5 — Acesso recuperável | C16–C19 | Revogar tokens, renovar sessão e recuperar senha por e-mail | C16 sustenta a base; restante é expansão |
| D6 — Administração observável | C20–C23 | Consultar alterações e atuar nas pendências do painel | Expansão; trilha de processo atende RF-36–37 |
| D7 — Validação completa | C24–C26 | Chefe devolve/aprova; autor corrige/reenvia; aprovado não muda | Base MVP |
| D7-extra — Publicação | C27–C28 | Publicar somente aprovado, se o escopo for formalizado | Extensão opcional |
| D8 — Transição encerrada | C29–C30 | Dados preservados, legado retirado e roteiro reproduzível | Encerramento da entrega escolhida |

Para uma entrega mínima de administração pelo Django Admin, priorizar D1–D3, C16 e D7. Aplicar a fatia correspondente de C30 a cada entrega; não esperar o fim para obter evidências. As telas de C10 podem ser adiadas no MVP se todos os consumidores existentes forem adaptados aos IDs e o gerenciamento institucional continuar no Django Admin.

## 7. Migração, compatibilidade e reversão

### Esquema e dados

1. Fazer inventário e backup verificado antes de aplicar migrações a dados existentes.
2. C07 só acrescenta estrutura. C08 prepara e preenche vínculos; C09 permite regularizar chefias. Não usar a migração para inventar responsável.
3. Durante a ponte, a API expõe IDs novos e rótulos de leitura legados. Escritas não podem ter duas fontes de verdade: resolver para ID ou rejeitar divergência.
4. C11 só muda a fonte de autorização quando o diagnóstico estiver resolvido e os consumidores adaptados. Revalidar chefia e estado no servidor a cada operação; não confiar na sessão armazenada no navegador.
5. C29 só remove campos após os consumidores migrarem. Como o aplicativo ainda pode usar rascunhos locais, migrar ou invalidar explicitamente o formato deles, sem reinterpretar um setor antigo como concessão de acesso.
6. `Processo.setor` fica vinculado ao setor original. Renomear setor não desloca processo; registrar a mudança no histórico. Trocar lotação de autor com processos continua bloqueado no escopo atual.

### Janelas de implantação

- **D1:** backend e frontend compatíveis precisam entrar juntos para não deixar o cadastro pendente sem uma tela de orientação. Não reverter para autocadastro com privilégio; corrigir para frente ou suspender cadastro temporariamente.
- **D2:** aplicar migração de permissões do admin, conferir contas existentes e só depois expor `/admin/`. Atender estáticos/CSRF no mesmo pacote de implantação.
- **D3:** esquema → diagnóstico → preenchimento/regularização → frontend por ID → corte da política. Usar janela de manutenção se não houver compatibilidade suficiente para coexistência das versões. Não implantar C11 com dados sem correspondência.
- **C16:** documentar se JWT antigos expiram imediatamente no corte. Comunicar necessidade de novo login; nunca aceitar token antigo sem verificação apenas para evitar logout.
- **D5:** instalar configurações de e-mail antes de anunciar recuperação como disponível. Não usar saída de console com tokens em produção.
- **D8:** remoção de campos exige backup e janela próprios; reverter código não restaura coluna/dado removido. Recuperação é por restauração testada ou migração corretiva compatível.

### Política de reversão

Cada commit com migração deve informar se é reversível sem perda. Guardar evidência da associação antiga→nova até o encerramento da transição, fora de arquivos públicos com dados pessoais. Para exclusão de usuário, guardar o evento e proteger relações; reversão não deve depender de recriar manualmente processos apagados. Para decisões de governança, não apagar evento anterior para “desfazer”: qualquer compensação futura precisa de regra explícita.

## 8. Verificações e roteiro de aceite

### Comandos de referência

Executar com as dependências do projeto disponíveis. Cada commit executa o subconjunto pertinente; executar a suíte completa antes de fechar uma entrega.

```bash
# Na raiz: consistência do Django e das migrações
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run

# Em backend/: testes existentes e novos casos da entrega
python -m pytest tests/test_users_auth.py tests/test_processes.py
python -m pytest tests/

# Em frontend/: validação estática e build
npm run lint
npm run build
```

Quando forem adicionados os testes frontend, declarar os scripts e comandos exatos no commit que introduzir o runner; não pressupor que `npm test` já existe. Testes de concorrência e migração devem rodar também em PostgreSQL, pois SQLite não reproduz os mesmos bloqueios. Usar o gateway de IA simulado para testes administrativos, sem chamadas pagas.

Conforme `AGENTS.md`, se um commit instalar dependências Python, atualizar `backend/requirements.txt` em UTF-8 com `pip freeze` no venv do backend e executar `python backend/scripts/check_requirements.py`. Não instalar dependências só para validar este documento.

### Cenários com evidência

Usar dados fictícios: administradores A1/A2, autor U1, colega U2, chefe H1, substituto H2 e dois setores em secretarias diferentes. Usar também setores homônimos para testar isolamento por ID.

| Cenário | Resultado esperado | Commits de referência |
|---|---|---|
| Cadastro enviando papel e setor | Conta operacional sem setor; sem privilégio recebido do payload | C02 |
| Usuário sem lotação acessa URL/API de processos | Bloqueio consistente; admin ainda gerencia estrutura | C02, C11 |
| U2 tenta consultar entrevista/processo de U1 | Não recebe o conteúdo nem o registro fora do escopo | C03, C11 |
| Admin mantém usuários pelo Django Admin e React | Mesmas validações e eventos; senha armazenada com hash | C05–C06, C14–C15 |
| Buscar e paginar usuários | Contagem/filtros estáveis, sem vazamento de dados | C12–C13 |
| Desativar ou rebaixar o último admin | Operação negada, inclusive concorrente e pelo Django Admin | C05 |
| Excluir conta com processo/revisão/chefia | Conflito explicado; processo e histórico preservados | C05, C09, C15 |
| Trocar chefe H1→H2 | H2 assume fila; H1 perde acesso por chefia; evento registra troca | C09, C11 |
| Reativar conta após desativação | Tokens antigos continuam inválidos; novo login permitido | C16 |
| Access expira durante chamadas simultâneas | Um refresh; sem loop e sem repetição de mutação por erro de rede | C17 |
| Recuperação de senha | Link expira/é de uso único; senha antiga e tokens revogados falham | C18–C19 |
| Consultar alterações administrativas | Autor/data/motivo e campos permitidos, sem segredos | C20–C21 |
| Painel com base conhecida e com API indisponível | Contadores corretos; indisponibilidade não aparece como zero | C22–C23 |
| Devolver sem comentário ou revisar fora da fila | Operação negada sem mudança parcial | C24 |
| H1 e H2 tentam revisar simultaneamente a mesma versão | Uma decisão válida; a outra recebe conflito ou perde escopo | C24 |
| Autor corrige e reenvia devolvido | Mesmo processo/entrevista, parecer preservado e volta à fila | C25–C26 |
| Alterar aprovado ou forjar status via PATCH | Operação negada para todos os atores | C03, C24–C26 |
| Publicar sem aprovação | Negado; só testar publicação se a extensão tiver sido incluída | C27–C28 |
| Migrar dados e restaurar backup de teste | Contagens e relações conferidas; recuperação reproduzível | C08, C29–C30 |

## 9. Critério de conclusão

Uma parte só está concluída quando seus comportamentos passam pela API e pela interface prevista, têm evidência de verificação e preservam os dados existentes. Menu, permissão cadastrada ou endpoint sem validação não contam como funcionalidade entregue.

Ao encerrar a entrega escolhida, atualizar este plano com os hashes dos commits, verificações realizadas e itens adiados. Não marcar publicação/homologação como prontas se C27–C28 permanecerem fora do escopo.

### Registro deste planejamento

- [x] Código e documentos da branch `feat/administracao` examinados na base `14925ff`.
- [x] Implementação dividida em partes e commits com dependências e critérios de auditoria.
- [x] Diferenças entre o código atual, o MVP documentado e a expansão explicitadas.
- [ ] Executar C01 e os demais commits de implementação.
