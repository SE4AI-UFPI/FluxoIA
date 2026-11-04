# FluxoIA — Levantamento de Requisitos

**Versão:** 0.5 (CF-01 a CF-10 resolvidos)
**Entrega do MVP:** terça-feira (a confirmar a data exata)
**Fontes:** `README.md`, `PRODUCT.md` e respostas do product owner.

Legenda de status: **Definido** (confirmado pelo product owner), **Assumido** (deduzido, precisa de confirmação), **Pendente** (decisão adiada pelo product owner).

---

## 1. Visão geral e escopo

### 1.1 Objetivo do MVP
Permitir que um servidor público responda a um questionário guiado e, a partir das respostas, obtenha um diagrama BPMN do processo do seu setor. O diagrama passa pela aprovação do chefe do setor e pode ser exportado.

### 1.2 Dentro do escopo (MVP)
- Cadastro aberto, login e logout com e-mail e senha.
- Gestão de usuários e setores pelo administrador.
- Dashboard como tela principal, com mapeamentos recentes e menu lateral.
- Passo a passo de uso da ferramenta.
- Entrevista com perguntas fixas e respostas em texto livre, com rascunho salvo e possibilidade de pausar e retomar.
- Análise prévia das respostas pela IA, com devolução de perguntas para contradições e lacunas.
- Geração do BPMN pela IA.
- Validação pelo chefe do setor (aprovar ou devolver com comentário).
- Correção de mapeamentos devolvidos com editor BPMN integrado à aplicação (CF-09).
- Lista de mapeamentos.
- Exportação em BPMN e PDF.
- Registro de auditoria restrito a quem gerou, quem aprovou ou rejeitou, e quando.

### 1.3 Fora do escopo (MVP)
- Edição de mapeamentos aprovados. Eles são imutáveis (RN-02) e só são editados em ferramenta externa, a partir do `.bpmn` exportado (**CF-01**).
- Reabertura de mapeamento aprovado (**RN-02**).
- Integração com SSO ou gov.br.
- Internacionalização. A aplicação é apenas em português.
- Requisitos formais de acessibilidade (decisão do product owner: nenhum por enquanto).
- Restrições de infraestrutura. A hospedagem é em VPS.

### 1.4 Escala
- Até **10 usuários** no início.
- Sem requisito formal de desempenho ou de número de usuários simultâneos.

---

## 2. Atores e perfis

| Perfil | Descrição | Como recebe o perfil |
|---|---|---|
| **Visitante** | Pessoa sem conta. Só pode se cadastrar e fazer login. | — |
| **Usuário comum (mapeador)** | Servidor que faz o mapeamento do próprio setor. | Definido pelo administrador |
| **Chefe de setor (validador)** | Valida os mapeamentos dos setores sob sua responsabilidade. Pode chefiar mais de um setor. | Definido pelo administrador |
| **Administrador** | Gerencia usuários e setores. | Definido pelo time de desenvolvimento |

**Regra de cadastro (definido):** o próprio usuário se cadastra. O administrador define depois se ele é usuário comum ou chefe e a qual setor pertence.

---

## 3. Requisitos funcionais

### 3.1 Acesso e conta

| ID | Requisito | Status |
|---|---|---|
| RF-01 | O visitante se cadastra informando e-mail e senha (cadastro aberto). | Definido |
| RF-02 | O usuário faz login e logout com e-mail e senha. A autenticação usa JWT, que já existe no backend. | Definido |
| RF-03 | Após o cadastro, o usuário fica sem perfil e sem setor até o administrador configurá-lo. Enquanto isso, não tem acesso a nenhuma função da aplicação, além de login e logout. | Definido (CF-07) |

### 3.2 Administração

| ID | Requisito | Status |
|---|---|---|
| RF-04 | O administrador lista os usuários cadastrados. | Assumido |
| RF-05 | O administrador define o perfil de cada usuário: comum ou chefe de setor. | Definido |
| RF-06 | O administrador define o setor de cada usuário. Cada usuário tem exatamente um setor. | Definido (CF-05) |
| RF-07 | O administrador cria, edita e desativa setores (grupos). | Definido |
| RF-08 | Cada setor tem exatamente um chefe, que o valida. Um chefe pode chefiar mais de um setor. | Definido (CF-06) |

### 3.3 Dashboard e navegação

| ID | Requisito | Status |
|---|---|---|
| RF-09 | A tela principal após o login é o **dashboard**. Ele lista os mapeamentos recentes do usuário. | Definido |
| RF-10 | Um menu lateral dá acesso às seções: dashboard, novo mapeamento, lista de mapeamentos, passo a passo e sair. Itens de administração aparecem só para o administrador. | Definido (seções) / Assumido (itens exatos) |
| RF-11 | Uma seção mostra o passo a passo de uso da ferramenta. | Definido |

### 3.4 Entrevista e análise prévia

| ID | Requisito | Status |
|---|---|---|
| RF-12 | O usuário inicia um novo mapeamento informando um título. | Assumido |
| RF-13 | A entrevista apresenta um conjunto fixo de perguntas. As respostas são texto livre. | Definido |
| RF-14 | As respostas são salvas como rascunho a cada pergunta respondida. | Definido |
| RF-15 | O usuário pode pausar a entrevista e retomá-la depois, do ponto em que parou. | Definido |
| RF-16 | Ao concluir a entrevista, a IA faz uma análise prévia das respostas, procurando contradições e lacunas. | Definido |
| RF-17 | Se a análise encontrar contradições ou lacunas, a IA devolve perguntas de esclarecimento ao usuário. O usuário responde, e a análise roda de novo. | Definido |
| RF-18 | A geração do BPMN só é liberada depois que a análise prévia não encontra mais pendências. | Definido |

### 3.5 Geração do BPMN

| ID | Requisito | Status |
|---|---|---|
| RF-19 | A IA gera um diagrama BPMN a partir das respostas validadas na análise prévia. | Definido |
| RF-20 | Os elementos BPMN que a IA deve produzir dependem do modelo atual que o product owner vai enviar. | Pendente (PD-01) |
| RF-21 | O usuário visualiza o diagrama gerado dentro da aplicação. | Assumido |
| RF-22 | O usuário envia o mapeamento para validação do chefe do setor. | Definido |

### 3.6 Validação

| ID | Requisito | Status |
|---|---|---|
| RF-23 | O chefe vê a fila de mapeamentos enviados para validação nos setores que chefia. | Definido |
| RF-24 | O chefe pode **aprovar** ou **devolver** um mapeamento. | Definido |
| RF-25 | Ao devolver, o chefe escreve um comentário. | Assumido (obrigatório) |
| RF-26 | O mapeador vê o comentário do chefe junto com a devolução. | Definido |
| RF-27 | Após a devolução, o mapeador corrige o mapeamento com o editor BPMN integrado à aplicação, usando o comentário do chefe como referência. Ao concluir, a versão corrigida volta para validação. | Definido (CF-02, CF-09) |
| RF-28 | Cada aprovação ou devolução gera um registro de versão com motivo, norma, autor, aprovador e data. | Definido (campos) / Pendente (norma) |
| RF-29 | Comentários de devolução são guardados e permanecem vinculados ao mapeamento. | Definido |

### 3.7 Lista e edição

| ID | Requisito | Status |
|---|---|---|
| RF-30 | O usuário vê a lista dos mapeamentos que gerou e, se for chefe, dos mapeamentos enviados aos setores que chefia, com status. | Definido (CF-04) |
| RF-31 | Mapeamentos aprovados não são editados dentro da aplicação. A edição deles é feita em ferramenta externa, a partir do `.bpmn` exportado (RF-32). | Definido (CF-01) |
| RF-38 | O editor BPMN integrado à aplicação permite corrigir mapeamentos devolvidos. Os recursos do editor ainda estão pendentes (PD-06). | Definido (CF-09) |

### 3.8 Exportação

| ID | Requisito | Status |
|---|---|---|
| RF-32 | O usuário exporta o mapeamento em arquivo `.bpmn`. | Definido |
| RF-33 | O usuário exporta o mapeamento em PDF. | Definido |
| RF-34 | O layout do PDF e o cabeçalho institucional são definidos depois. | Pendente (PD-04) |
| RF-35 | A ferramenta de referência para o `.bpmn` (ex.: Camunda Modeler ou bpmn.io) é definida depois. | Pendente (PD-03) |

### 3.9 Auditoria

| ID | Requisito | Status |
|---|---|---|
| RF-36 | O sistema registra quem gerou o mapeamento, quem aprovou ou rejeitou e quando. | Definido |
| RF-37 | Esses registros são visíveis apenas para o usuário que gerou o mapeamento e para o chefe do setor. | Definido (CF-04) |

---

## 4. Requisitos não funcionais

| ID | Requisito | Status |
|---|---|---|
| RNF-01 | Backend em Django REST; frontend em React, Vite, TypeScript, Tailwind e shadcn (stack já existente). | Definido |
| RNF-02 | Hospedagem em VPS. | Definido |
| RNF-03 | Interface web responsiva, funcional em desktop e mobile. Não há app nativo. | Definido |
| RNF-04 | Interface e conteúdo somente em português. | Definido |
| RNF-05 | Capacidade inicial de até 10 usuários. | Definido |
| RNF-06 | Sem requisito formal de desempenho. | Definido |
| RNF-07 | Sem requisito formal de acessibilidade no MVP. Risco registrado (ver seção 8). | Definido |
| RNF-08 | Conformidade com a LGPD. Não há política de segurança da secretaria. | Definido |
| RNF-09 | Provedor de IA com modelo comercial, por API. Há orçamento para chamadas. | Definido (provedor e modelo: PD-05) |
| RNF-10 | Os dados de entrada da entrevista podem ser enviados a provedor externo de IA. | Definido |
| RNF-11 | Rascunhos e respostas da entrevista são retidos por aproximadamente 15 dias. Mapeamentos aprovados e registros de auditoria não entram nesse prazo. | Definido (CF-03) |
| RNF-12 | Autenticação com e-mail e senha. | Definido |
| RNF-13 | A avaliação da IA é feita durante o uso pelos testers, sem conjunto de casos de referência fixo. | Definido |

---

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | A IA não decide. Toda versão precisa da aprovação do chefe do setor para ser considerada final. |
| RN-02 | Mapeamento aprovado não pode ser reaberto. |
| RN-03 | O chefe só valida mapeamentos de setores que chefia. |
| RN-04 | Mapeamento só pode ser enviado para validação depois que a análise prévia não tem pendências (RF-18). |
| RN-05 | Usuário sem setor não tem acesso a nenhuma função da aplicação, além de login e logout (RF-03, CF-07). |
| RN-06 | Os comentários de devolução são permanentes. |
| RN-07 | Cada usuário pertence a exatamente um setor, e cada setor tem exatamente um chefe (CF-05, CF-06). |
| RN-08 | Um mapeamento é visível somente para quem o gerou e para o chefe do setor ao qual pertence (CF-04). |
| RN-09 | O chefe pode aprovar ou devolver um mapeamento que ele mesmo gerou. A auditoria registra autor e aprovador como o mesmo usuário nesse caso (CF-10). |

---

## 6. Ciclo de vida do mapeamento

```
[Rascunho] ──concluir entrevista──▶ [Análise prévia]
     ▲                                   │
     │                  contradições/lacunas
     │                                   ▼
     │                         [Aguardando esclarecimento] ──responder──┐
     │                                   ▲                              │
     │                                   └──────── nova análise ◀───────┘
     │                                   │ sem pendências
     │                                   ▼
     │                              [Gerado (BPMN)]
     │                                   │ enviar
     │                                   ▼
     │                          [Em validação] ──aprovar──▶ [Aprovado] (imutável, RN-02)
     │                                   │
     │                               devolver
     │                                   ▼
     └────────── correção manual pelo mapeador ◀── [Devolvido]
```

---

## 7. Histórias de usuário e critérios de aceite

**US-01 — Cadastro.** Como visitante, quero criar uma conta com e-mail e senha para acessar a ferramenta.
- Dado um e-mail não cadastrado, quando eu informo e-mail e senha, então a conta é criada sem perfil e sem setor.
- Dado um e-mail já cadastrado, quando tento cadastrar de novo, então vejo uma mensagem de erro e nenhuma conta é criada.

**US-02 — Configurar acesso.** Como administrador, quero definir o perfil e o setor de cada usuário para que ele possa trabalhar.
- Dado um usuário sem setor, quando eu defino perfil e setor, então ele passa a acessar o fluxo de mapeamento.

**US-03 — Dashboard.** Como usuário, quero ver meus mapeamentos recentes ao entrar.
- Dado que estou logado, então a primeira tela é o dashboard com a lista dos mapeamentos recentes.
- Dado que não tenho mapeamentos, então vejo um estado vazio com atalho para iniciar um.

**US-04 — Navegação.** Como usuário, quero navegar pelas seções pelo menu lateral.
- Dado que estou em qualquer tela, quando clico em um item do menu, então sou levado à seção correspondente.
- Dado que sou usuário comum, então não vejo itens de administração.

**US-05 — Entrevista com rascunho.** Como mapeador, quero responder a entrevista em partes e retomar depois.
- Dado que respondi algumas perguntas e saí, quando volto, então continuo de onde parei com as respostas salvas.

**US-06 — Análise prévia.** Como mapeador, quero que a ferramenta aponte contradições e lacunas antes de gerar o diagrama.
- Dado que concluí a entrevista, quando a análise encontra contradição, então vejo as perguntas de esclarecimento.
- Dado que respondi os esclarecimentos, quando a análise não encontra pendências, então posso gerar o BPMN.

**US-07 — Geração.** Como mapeador, quero gerar o BPMN a partir das respostas validadas.
- Dado que a análise prévia está sem pendências, quando eu peço a geração, então vejo o diagrama gerado.

**US-08 — Envio para validação.** Como mapeador, quero enviar o mapeamento ao chefe do setor.
- Dado um mapeamento gerado, quando eu envio, então ele aparece na fila do chefe do setor correspondente.

**US-09 — Aprovação.** Como chefe de setor, quero aprovar um mapeamento do meu setor.
- Dado um mapeamento em validação de um setor que chefio, quando aprovo, então ele vira versão aprovada e fica imutável.
- Dado um mapeamento de um setor que não chefio, então não vejo nem consigo aprová-lo.

**US-10 — Devolução com comentário.** Como chefe de setor, quero devolver um mapeamento com comentário.
- Dado um mapeamento em validação, quando devolvo sem comentário, então a ação é bloqueada.
- Dado que devolvi com comentário, então o mapeador vê o comentário e o mapeamento volta para correção.

**US-11 — Correção após devolução.** Como mapeador, quero corrigir um mapeamento devolvido usando o comentário do chefe.
- Dado um mapeamento devolvido, quando abro o mapeamento, então vejo o comentário do chefe e o status "devolvido".
- Dado um mapeamento devolvido, quando faço a correção no editor integrado, então a nova versão segue para validação.

**US-12 — Lista de mapeamentos.** Como usuário, quero ver os mapeamentos e seus status.
- Dado que estou na lista, então vejo cada mapeamento com título, setor, status e data.

**US-13 — Exportação.** Como usuário, quero exportar o mapeamento aprovado em BPMN ou PDF.
- Dado um mapeamento aprovado, quando exporto em BPMN, então recebo um arquivo `.bpmn` válido.
- Dado um mapeamento aprovado, quando exporto em PDF, então recebo um PDF do mapeamento.

**US-14 — Auditoria.** Como mapeador ou chefe de setor, quero saber quem gerou e quem aprovou ou devolveu cada mapeamento.
- Dado um mapeamento que gerei ou que chefio, então vejo autor, aprovador ou devolvente e datas.
- Dado um mapeamento de outro setor, então não vejo seus registros de auditoria.

**US-15 — Passo a passo.** Como usuário, quero um passo a passo de uso.
- Dado que acesso a seção, então vejo as etapas do fluxo de mapeamento.

**US-16 — Logout.** Como usuário, quero sair da conta.
- Dado que estou logado, quando faço logout, então a sessão é encerrada e volto à tela de login.

---

## 8. Conflitos

| ID | Conflito | Resolução / Por que importa |
|---|---|---|
| **CF-01 (resolvido)** | "Edição de um mapeamento já feito" (1.2, item 4.1.2) versus edição apenas **fora da aplicação** (item 16). | Mapeamentos aprovados só são editados em ferramenta externa, a partir do `.bpmn` exportado. Para correção de devolvidos, há editor integrado (CF-09). |
| **CF-02 (resolvido)** | Correção após devolução: manual ou regeneração pela IA? | Correção manual pelo mapeador. Ver CF-09 sobre como ela entra no sistema. |
| **CF-03 (resolvido)** | Retenção de ~15 dias: rascunhos e respostas, ou também mapeamentos aprovados? | Apenas rascunhos e respostas da entrevista. Aprovados e auditoria não expiram por esse prazo. |
| **CF-04 (resolvido)** | Quem pode ver os mapeamentos? | Visível apenas para quem gerou e para o chefe do setor (RN-08). Vale também para os registros de auditoria, que deixam de ser visíveis ao administrador. |
| **CF-05 (resolvido)** | Um usuário pode pertencer a mais de um setor? | Não. Cada usuário tem exatamente um setor. |
| **CF-06 (resolvido)** | Um setor pode ter mais de um chefe? | Não. Cada setor tem exatamente um chefe. |
| **CF-07 (resolvido)** | Um usuário sem setor pode entrar na aplicação? | Pode fazer login, mas não tem acesso a nenhuma função. |
| **CF-08 (resolvido)** | Um chefe também é mapeador, ou os perfis são exclusivos? | Os perfis não são exclusivos: um chefe também pode gerar mapeamentos. Interpretação da resposta "nem perfis exclusivos", a confirmar. |
| **CF-10 (resolvido)** | Um chefe pode aprovar ou devolver um mapeamento que ele mesmo gerou? | Sim, pode validar o próprio trabalho (RN-09). A auditoria registra o caso. |
| **CF-09 (resolvido)** | Como a correção manual volta para o sistema? | Por editor BPMN integrado à aplicação. Não há importação de `.bpmn`. Isso torna o editor parte do MVP. |

---

## 9. Pendências

| ID | Pendência | Responsável | Impacto |
|---|---|---|---|
| **PD-01** | Modelo atual de processo anexado pelo product owner. A lista de elementos BPMN depende dele. **Ainda não recebido.** | Product owner | RF-20 |
| **PD-02** | Definição de "norma" no histórico de versões (README). | Product owner | RF-28 |
| **PD-03** | Ferramenta de referência para o `.bpmn` (Camunda Modeler, bpmn.io ou outra). | Product owner | RF-35 |
| **PD-04** | Layout do PDF e cabeçalho institucional. | Product owner | RF-34 |
| **PD-05** | Provedor e modelo comercial de IA. | Time de desenvolvimento | RNF-09 |
| **PD-06** | Recursos do editor BPMN integrado: arrastar e soltar, desfazer, comentários, validação do diagrama. | Product owner | RF-38 |

---

## 10. Riscos

- **Prazo curto (terça).** O editor BPMN integrado (CF-09) entra no MVP e é o item de maior risco para o prazo. Suas funções ainda não foram definidas (PD-06).
- **Dependência do modelo BPMN** (PD-01) para definir os elementos gerados pela IA.
- **Acessibilidade sem requisito formal.** O público é de servidores públicos. Recomenda-se ao menos contraste adequado e navegação por teclado, mesmo sem exigência formal.
- **Qualidade da IA sem casos de referência.** A avaliação depende dos testers, então o feedback precisa ser registrado durante o uso.
- **Custo de API comercial.** Sem limite definido de custo por geração, o uso pode crescer sem controle.
