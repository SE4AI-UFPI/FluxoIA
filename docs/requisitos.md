# FluxoIA — Levantamento de Requisitos

**Versão:** 0.6 (pendências PD-01 a PD-06 resolvidas; escopo do MVP fechado)
**Entrega do MVP:** terça-feira, 10/11/2026
**Fontes:** `README.md`, `PRODUCT.md`, respostas do product owner, `FLUXOGRAMAS - AAD e CEU.pdf` (modelo de processo), gabaritos em `eda_corpus/data/gabarito/` e roteiro de entrevista de referência.
**Plano de execução:** [`analise-mvp.md`](analise-mvp.md).

Legenda de status: **Definido** (confirmado pelo product owner), **Assumido** (deduzido, precisa de confirmação), **Pendente** (decisão adiada), **Pós-MVP** (fora do MVP, fica para depois).

---

## 1. Visão geral e escopo

### 1.1 Objetivo do MVP
Permitir que um servidor público responda a uma entrevista em formato de chat, com roteiro fixo, e, a partir das respostas, obtenha um diagrama BPMN do processo do seu setor gerado por IA. O servidor pode ajustar o diagrama em um editor integrado. O diagrama passa pela aprovação do chefe do setor e pode ser exportado em BPMN e PDF.

### 1.2 Dentro do escopo (MVP)
- Cadastro aberto (e-mail, senha e nome), login e logout.
- Gestão de usuários e setores pelo administrador, feita pelo Django Admin.
- Dashboard como tela principal, com mapeamentos recentes e menu lateral.
- Passo a passo de uso da ferramenta.
- Entrevista em formato de chat com 14 perguntas fixas (Anexo A), sem IA durante a conversa, com rascunho salvo, pausa e retomada.
- Edição das respostas até a geração do diagrama e consulta do histórico da entrevista pelo autor.
- Geração do BPMN e do resumo do processo pela IA, por meio do LiteLLM Proxy.
- Editor BPMN integrado, com os recursos padrão do bpmn-js, para ajustar o diagrama antes do envio e corrigir mapeamentos devolvidos.
- Validação pelo chefe do setor (aprovar ou devolver com comentário).
- Lista de mapeamentos.
- Exportação em BPMN e PDF, em qualquer status.
- Registro de auditoria: quem gerou, quem aprovou ou devolveu, e quando.

### 1.3 Fora do escopo (MVP)
- Edição de mapeamentos aprovados. Eles são imutáveis (RN-02) e só são editados em ferramenta externa, a partir do `.bpmn` exportado (**CF-01**).
- Reabertura de mapeamento aprovado (**RN-02**).
- Análise prévia das respostas pela IA, com perguntas de esclarecimento (RF-16 a RF-18). **Pós-MVP.**
- Versionamento de mapeamentos e campo "norma" (RF-28, PD-02). **Pós-MVP.**
- Painel de propriedades e comentários no diagrama do editor BPMN (RF-38). **Pós-MVP.**
- Telas próprias de administração. No MVP, o Django Admin cumpre esse papel.
- Retenção automática de rascunhos e respostas por 15 dias (RNF-11). **Pós-MVP.**
- Troca de setor de um usuário que já tem mapeamentos.
- Perguntas sobre gargalos, indicadores e melhorias na entrevista.
- Limite de custo de IA dentro da aplicação. O gasto é acompanhado no LiteLLM Proxy.
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
| **Usuário comum (mapeador)** | Servidor que faz o mapeamento do próprio setor. | O administrador define o setor |
| **Chefe de setor (validador)** | Valida os mapeamentos dos setores sob sua responsabilidade. Pode chefiar mais de um setor e também pode mapear. | O administrador o indica como chefe de um ou mais setores |
| **Administrador** | Gerencia usuários e setores pelo Django Admin. Se tiver setor, também pode mapear. | O primeiro é criado pelo time de desenvolvimento com `createsuperuser` |

**Regra de cadastro (definido):** o próprio usuário se cadastra informando e-mail, senha e nome. Ele não escolhe perfil nem setor. O administrador define depois a qual setor ele pertence e quem chefia cada setor.

---

## 3. Requisitos funcionais

### 3.1 Acesso e conta

| ID | Requisito | Status |
|---|---|---|
| RF-01 | O visitante se cadastra informando e-mail, senha e nome (cadastro aberto). O cadastro não aceita perfil nem setor. | Definido |
| RF-02 | O usuário faz login e logout com e-mail e senha. A autenticação usa JWT, que já existe no backend. | Definido |
| RF-03 | Após o cadastro, o usuário fica sem setor até o administrador configurá-lo. Enquanto isso, só pode fazer login e logout, e vê uma tela informando que aguarda liberação. | Definido (CF-07) |
| RF-39 | O usuário não pode alterar o próprio setor nem o próprio perfil. Só o administrador altera esses dados. | Definido |

### 3.2 Administração

| ID | Requisito | Status |
|---|---|---|
| RF-04 | O administrador lista os usuários cadastrados. No MVP, pelo Django Admin. | Definido |
| RF-05 | O administrador define quem é chefe de setor, indicando o chefe de cada setor (RF-08). | Definido |
| RF-06 | O administrador define o setor de cada usuário. Cada usuário tem exatamente um setor. | Definido (CF-05) |
| RF-07 | O administrador cria, edita e desativa setores (grupos). No MVP, pelo Django Admin. | Definido |
| RF-08 | Cada setor tem exatamente um chefe, que o valida. Um chefe pode chefiar mais de um setor. | Definido (CF-06) |
| RF-40 | Quando o chefe de um setor muda, os mapeamentos pendentes e o histórico do setor passam a ser visíveis ao novo chefe, e o chefe anterior perde o acesso. | Definido |

### 3.3 Dashboard e navegação

| ID | Requisito | Status |
|---|---|---|
| RF-09 | A tela principal após o login é o **dashboard**. Ele lista os mapeamentos recentes do usuário. | Definido |
| RF-10 | Um menu lateral dá acesso às seções: dashboard, novo mapeamento, lista de mapeamentos, passo a passo e sair. Para o administrador, há também um atalho para o Django Admin. | Definido (seções) / Assumido (itens exatos) |
| RF-11 | Uma seção mostra o passo a passo de uso da ferramenta. | Definido |

### 3.4 Entrevista

| ID | Requisito | Status |
|---|---|---|
| RF-12 | O usuário inicia um novo mapeamento abrindo uma nova entrevista. O título do mapeamento é a resposta da pergunta 1 (nome do processo). | Assumido |
| RF-13 | A entrevista é um chat com roteiro fixo: as 14 perguntas do Anexo A aparecem como mensagens do sistema, uma por vez, com frases fixas de transição entre os blocos. As respostas são texto livre. Não há chamada à IA durante a entrevista. | Definido |
| RF-14 | Cada resposta é salva assim que é enviada. | Definido |
| RF-15 | O usuário pode sair e voltar depois. Ao reabrir, o chat mostra a conversa até ali e continua da próxima pergunta sem resposta. | Definido |
| RF-16 | Ao concluir a entrevista, a IA faz uma análise prévia das respostas, procurando contradições e lacunas. | Pós-MVP |
| RF-17 | Se a análise encontrar contradições ou lacunas, a IA devolve perguntas de esclarecimento ao usuário, e o mapeador pode respondê-las ou seguir mesmo assim, com as pendências registradas. | Pós-MVP |
| RF-18 | No MVP, a geração do BPMN é liberada quando todas as perguntas têm resposta. Ao responder a última, o chat oferece o botão "Gerar diagrama". | Definido |
| RF-41 | O usuário pode editar qualquer resposta já enviada, pelo próprio balão do chat, até pedir a geração do diagrama. Depois disso, a entrevista fica somente para leitura. | Definido |
| RF-42 | O autor consulta o histórico da entrevista de cada mapeamento, em uma aba "Entrevista" no detalhe do mapeamento. | Definido |
| RF-43 | Perguntas que nem todo processo tem (9, 10, 12 e 13) oferecem a resposta rápida "Não se aplica". | Assumido |

### 3.5 Geração do BPMN

| ID | Requisito | Status |
|---|---|---|
| RF-19 | A IA gera o fluxo do processo a partir das respostas da entrevista, em um formato intermediário (JSON), e o sistema o converte em BPMN 2.0. | Definido |
| RF-20 | Os elementos BPMN gerados são: piscina com uma raia por setor, evento de início, tarefa, evento de fim, gateway exclusivo e fluxo de sequência com rótulo da condição. A referência são os fluxogramas 2.1 a 2.5 de `FLUXOGRAMAS - AAD e CEU.pdf` e seus gabaritos em `eda_corpus/data/gabarito/`. | Definido (PD-01) |
| RF-21 | O usuário visualiza o diagrama gerado dentro da aplicação. | Definido |
| RF-44 | Junto com o diagrama, a IA gera um resumo do processo: objetivo, entradas, saídas e responsáveis. O mapeador pode editar o resumo antes do envio. | Definido |
| RF-45 | O mapeador pode ajustar o diagrama gerado no editor integrado antes de enviá-lo para validação. | Definido |
| RF-22 | O usuário envia o mapeamento para validação do chefe do setor. | Definido |

### 3.6 Validação

| ID | Requisito | Status |
|---|---|---|
| RF-23 | O chefe vê a fila de mapeamentos enviados para validação nos setores que chefia. | Definido |
| RF-24 | O chefe pode **aprovar** ou **devolver** um mapeamento. | Definido |
| RF-25 | Ao devolver, o chefe escreve um comentário. O comentário é obrigatório. | Definido |
| RF-26 | O mapeador vê o comentário do chefe junto com a devolução. | Definido |
| RF-27 | Após a devolução, o mapeador corrige o mapeamento no editor BPMN integrado, usando o comentário do chefe como referência. Ao reenviar, o mapeamento volta direto para validação, sem refazer a entrevista. | Definido (CF-02, CF-09, CF-11) |
| RF-28 | A aprovação registra o aprovador e a data. Não há número de versão nem campo "norma" no MVP. | Definido (CF-12) / Pós-MVP (versionamento e norma) |
| RF-29 | Comentários de devolução são guardados e permanecem vinculados ao mapeamento. | Definido |

### 3.7 Lista e edição

| ID | Requisito | Status |
|---|---|---|
| RF-30 | O usuário vê a lista dos mapeamentos que gerou e, se for chefe, dos mapeamentos dos setores que chefia, com status. | Definido (CF-04) |
| RF-31 | Mapeamentos aprovados não são editados dentro da aplicação. A edição deles é feita em ferramenta externa, a partir do `.bpmn` exportado (RF-32). | Definido (CF-01) |
| RF-38 | O editor BPMN integrado usa o bpmn-js com seus recursos padrão: criar, mover, conectar e remover elementos, renomear direto no diagrama, desfazer e refazer. Ele fica disponível nos status "Gerado" e "Devolvido". Ao salvar, guarda o XML e uma cópia em SVG do diagrama. | Definido (PD-06) |
| RF-46 | Painel de propriedades e comentários no diagrama. | Pós-MVP (corte da análise do MVP) |

### 3.8 Exportação

| ID | Requisito | Status |
|---|---|---|
| RF-32 | O autor e o chefe do setor exportam o mapeamento em arquivo `.bpmn`, em qualquer status. | Definido (CF-13) |
| RF-33 | O autor e o chefe do setor exportam o mapeamento em PDF, em qualquer status. | Definido (CF-13) |
| RF-34 | O PDF segue a especificação do Anexo B. Quando o mapeamento não está aprovado, o PDF traz aviso textual e marca d'água "NÃO APROVADO". O PDF inclui o histórico de devoluções (data, chefe e comentário). | Definido (PD-04) |
| RF-35 | A ferramenta de referência para o `.bpmn` é o bpmn.io / bpmn-js. O arquivo exportado deve abrir corretamente nele. | Definido (PD-03) |

### 3.9 Auditoria

| ID | Requisito | Status |
|---|---|---|
| RF-36 | O sistema registra quem gerou o mapeamento, quem aprovou ou devolveu e quando. | Definido |
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
| RNF-07 | Sem requisito formal de acessibilidade no MVP. Risco registrado (ver seção 10). | Definido |
| RNF-08 | Conformidade com a LGPD. Não há política de segurança da secretaria. | Definido |
| RNF-09 | A aplicação acessa os modelos de IA pelo LiteLLM Proxy, hospedado na VPS, usando a API compatível com OpenAI e aliases de modelo definidos no proxy. O gasto com IA é acompanhado pelo proxy. | Definido (PD-05) |
| RNF-10 | Os dados de entrada da entrevista podem ser enviados a provedor externo de IA. | Definido |
| RNF-11 | Rascunhos e respostas da entrevista são retidos por aproximadamente 15 dias. Mapeamentos aprovados e registros de auditoria não entram nesse prazo. | Pós-MVP (CF-03) |
| RNF-12 | Autenticação com e-mail e senha. | Definido |
| RNF-13 | A avaliação da IA é feita durante o uso pelos testers. Os gabaritos 2.1 a 2.5 servem como referência adicional para medir a geração. | Definido |
| RNF-14 | O PDF é gerado no backend com WeasyPrint. A impressão pelo navegador não é usada, porque quebra o cabeçalho repetido. | Definido |
| RNF-15 | O LiteLLM Proxy registra apenas metadados das chamadas (tokens, custo, usuário, latência), sem o texto das entrevistas. | Assumido |
| RNF-16 | A geração do diagrama pode levar dezenas de segundos. A interface mostra um estado de "gerando" enquanto isso. | Assumido |

---

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | A IA não decide. Todo mapeamento precisa da aprovação do chefe do setor para ser considerado final. |
| RN-02 | Mapeamento aprovado não pode ser reaberto. |
| RN-03 | O chefe só valida mapeamentos de setores que chefia. |
| RN-04 | Mapeamento só pode ser enviado para validação depois que a análise prévia não tem pendências. **Pós-MVP**, junto com a análise prévia. No MVP, basta o diagrama ter sido gerado. |
| RN-05 | Usuário sem setor não tem acesso a nenhuma função da aplicação, além de login e logout (RF-03, CF-07). |
| RN-06 | Os comentários de devolução são permanentes. |
| RN-07 | Cada usuário pertence a exatamente um setor, e cada setor tem exatamente um chefe (CF-05, CF-06). |
| RN-08 | Um mapeamento é visível somente para quem o gerou e para o chefe do setor ao qual pertence (CF-04). |
| RN-09 | O chefe pode aprovar ou devolver um mapeamento que ele mesmo gerou. A auditoria registra autor e aprovador como o mesmo usuário nesse caso (CF-10). |
| RN-10 | O histórico da entrevista é visível somente para o autor do mapeamento. O chefe vê o diagrama, o resumo e o PDF. |
| RN-11 | Quando o chefe de um setor muda, o novo chefe assume a fila e o histórico do setor, e o anterior perde o acesso (RF-40). |
| RN-12 | O mapeamento pertence ao setor em que foi criado. |
| RN-13 | As respostas da entrevista só podem ser editadas enquanto o diagrama não foi gerado (RF-41). |

---

## 6. Ciclo de vida do mapeamento

```
[Rascunho] ── entrevista em chat; respostas editáveis
     │
     │ gerar diagrama (IA)
     ▼
[Gerado] ── diagrama e resumo editáveis pelo mapeador
     │
     │ enviar
     ▼
[Em validação] ──aprovar──▶ [Aprovado] (imutável, RN-02)
     │      ▲
 devolver   │ reenviar
     ▼      │
[Devolvido] ── correção no editor integrado
```

---

## 7. Histórias de usuário e critérios de aceite

**US-01 — Cadastro.** Como visitante, quero criar uma conta com e-mail, senha e nome para acessar a ferramenta.
- Dado um e-mail não cadastrado, quando eu informo e-mail, senha e nome, então a conta é criada sem setor.
- Dado um e-mail já cadastrado, quando tento cadastrar de novo, então vejo uma mensagem de erro e nenhuma conta é criada.
- Dado que envio perfil ou setor no cadastro, então esses dados são ignorados.

**US-02 — Configurar acesso.** Como administrador, quero definir o setor de cada usuário e o chefe de cada setor para que eles possam trabalhar.
- Dado um usuário sem setor, quando eu defino o setor dele, então ele passa a acessar o fluxo de mapeamento.
- Dado um usuário sem setor, quando ele faz login, então vê a tela de aguardando liberação.

**US-03 — Dashboard.** Como usuário, quero ver meus mapeamentos recentes ao entrar.
- Dado que estou logado, então a primeira tela é o dashboard com a lista dos mapeamentos recentes.
- Dado que não tenho mapeamentos, então vejo um estado vazio com atalho para iniciar um.

**US-04 — Navegação.** Como usuário, quero navegar pelas seções pelo menu lateral.
- Dado que estou em qualquer tela, quando clico em um item do menu, então sou levado à seção correspondente.
- Dado que não sou administrador, então não vejo o atalho de administração.

**US-05 — Entrevista em chat.** Como mapeador, quero responder a entrevista como uma conversa, em partes, e retomar depois.
- Dado que iniciei um mapeamento, então vejo a primeira pergunta como mensagem do chat.
- Dado que respondi algumas perguntas e saí, quando volto, então vejo a conversa até ali e continuo da próxima pergunta sem resposta.
- Dado que respondi todas as perguntas, então vejo o botão "Gerar diagrama".

**US-06 — Análise prévia.** *Pós-MVP.* Como mapeador, quero que a ferramenta aponte contradições e lacunas antes de gerar o diagrama.

**US-07 — Geração.** Como mapeador, quero gerar o BPMN a partir das minhas respostas.
- Dado que respondi todas as perguntas, quando peço a geração, então vejo um indicador de progresso e, em seguida, o diagrama e o resumo do processo.
- Dado que a IA devolve um resultado inválido, então vejo uma mensagem de erro e posso tentar de novo, sem perder as respostas.

**US-08 — Envio para validação.** Como mapeador, quero enviar o mapeamento ao chefe do setor.
- Dado um mapeamento gerado, quando eu envio, então ele aparece na fila do chefe do setor correspondente.

**US-09 — Aprovação.** Como chefe de setor, quero aprovar um mapeamento do meu setor.
- Dado um mapeamento em validação de um setor que chefio, quando aprovo, então ele fica aprovado e imutável, com meu nome e a data registrados.
- Dado um mapeamento de um setor que não chefio, então não vejo nem consigo aprová-lo.

**US-10 — Devolução com comentário.** Como chefe de setor, quero devolver um mapeamento com comentário.
- Dado um mapeamento em validação, quando devolvo sem comentário, então a ação é bloqueada.
- Dado que devolvi com comentário, então o mapeador vê o comentário e o mapeamento fica com status "devolvido".

**US-11 — Correção após devolução.** Como mapeador, quero corrigir um mapeamento devolvido usando o comentário do chefe.
- Dado um mapeamento devolvido, quando abro o mapeamento, então vejo o comentário do chefe e o status "devolvido".
- Dado um mapeamento devolvido, quando corrijo no editor integrado e reenvio, então ele volta direto para a fila do chefe.

**US-12 — Lista de mapeamentos.** Como usuário, quero ver os mapeamentos e seus status.
- Dado que estou na lista, então vejo cada mapeamento com título, setor, status e data da última atualização.

**US-13 — Exportação.** Como autor ou chefe do setor, quero exportar o mapeamento em BPMN ou PDF.
- Dado um mapeamento em qualquer status, quando exporto em BPMN, então recebo um arquivo `.bpmn` que abre no bpmn.io.
- Dado um mapeamento aprovado, quando exporto em PDF, então recebo o PDF com status "Aprovado", aprovador e data.
- Dado um mapeamento não aprovado, quando exporto em PDF, então o PDF traz aviso e marca d'água "NÃO APROVADO".
- Dado um mapeamento que já foi devolvido, quando exporto em PDF, então o PDF traz o histórico de devoluções.

**US-14 — Auditoria.** Como mapeador ou chefe de setor, quero saber quem gerou e quem aprovou ou devolveu cada mapeamento.
- Dado um mapeamento que gerei ou que chefio, então vejo autor, aprovador ou devolvente e datas.
- Dado um mapeamento de outro setor, então não vejo seus registros de auditoria.

**US-15 — Passo a passo.** Como usuário, quero um passo a passo de uso.
- Dado que acesso a seção, então vejo as etapas do fluxo de mapeamento.

**US-16 — Logout.** Como usuário, quero sair da conta.
- Dado que estou logado, quando faço logout, então a sessão é encerrada e volto à tela de login.

**US-17 — Editar resposta.** Como mapeador, quero corrigir uma resposta que já enviei no chat.
- Dado que o diagrama ainda não foi gerado, quando edito uma resposta, então a nova resposta substitui a anterior.
- Dado que o diagrama já foi gerado, então não consigo editar as respostas.

**US-18 — Consultar entrevista.** Como mapeador, quero consultar as respostas que dei na entrevista.
- Dado um mapeamento que gerei, quando abro a aba "Entrevista", então vejo a conversa completa.
- Dado que sou chefe e não sou o autor, então não vejo a aba "Entrevista".

**US-19 — Ajustar antes de enviar.** Como mapeador, quero ajustar o diagrama e o resumo gerados antes de enviar ao chefe.
- Dado um mapeamento gerado, quando altero o diagrama no editor e salvo, então a alteração fica guardada e é a que segue para validação.

---

## 8. Conflitos

| ID | Conflito | Resolução |
|---|---|---|
| **CF-01 (resolvido)** | "Edição de um mapeamento já feito" versus edição apenas **fora da aplicação**. | Mapeamentos aprovados só são editados em ferramenta externa, a partir do `.bpmn` exportado. Para gerados e devolvidos, há editor integrado (CF-09). |
| **CF-02 (resolvido)** | Correção após devolução: manual ou regeneração pela IA? | Correção manual pelo mapeador, no editor integrado. |
| **CF-03 (resolvido)** | Retenção de ~15 dias: rascunhos e respostas, ou também mapeamentos aprovados? | Apenas rascunhos e respostas da entrevista. A retenção automática ficou para depois do MVP. |
| **CF-04 (resolvido)** | Quem pode ver os mapeamentos? | Apenas quem gerou e o chefe do setor (RN-08). Vale também para a auditoria. O histórico da entrevista é só do autor (RN-10). |
| **CF-05 (resolvido)** | Um usuário pode pertencer a mais de um setor? | Não. Cada usuário tem exatamente um setor. |
| **CF-06 (resolvido)** | Um setor pode ter mais de um chefe? | Não. Cada setor tem exatamente um chefe. |
| **CF-07 (resolvido)** | Um usuário sem setor pode entrar na aplicação? | Pode fazer login, mas não tem acesso a nenhuma função. |
| **CF-08 (resolvido)** | Um chefe também é mapeador, ou os perfis são exclusivos? | Os perfis não são exclusivos: um chefe também pode gerar mapeamentos. O administrador também pode mapear se tiver setor. |
| **CF-09 (resolvido)** | Como a correção manual volta para o sistema? | Por editor BPMN integrado à aplicação. Não há importação de `.bpmn`. |
| **CF-10 (resolvido)** | Um chefe pode aprovar ou devolver um mapeamento que ele mesmo gerou? | Sim (RN-09). A auditoria registra o caso. |
| **CF-11 (resolvido)** | O diagrama do ciclo de vida (v0.5) mandava o devolvido de volta para "Rascunho", mas o RF-27 mandava direto para validação. | Direto para validação, depois da correção no editor. |
| **CF-12 (resolvido)** | O PRODUCT.md dizia que só a aprovação gera versão; o RF-28 dizia aprovação ou devolução. Com RN-02, todo mapeamento teria no máximo a versão 1. | Sem versionamento no MVP. A aprovação registra aprovador e data. |
| **CF-13 (resolvido)** | A US-13 restringia a exportação a mapeamentos aprovados; RF-32 e RF-33 não restringiam. | Exportação em qualquer status, por autor e chefe. O PDF de não aprovado traz marca d'água. |
| **CF-14 (resolvido)** | O RF-01 pedia só e-mail e senha, mas o backend aceitava papel, setor, secretaria, cargo e matrícula no cadastro. | Cadastro com e-mail, senha e nome. O backend precisa ser ajustado (ver `analise-mvp.md`). |
| **CF-15 (resolvido)** | O roteiro de referência tem cerca de 37 perguntas, com jargão ("AS IS", "SIPOC", "POP") e linguagem de empresa, e não pergunta quem faz cada etapa nem pelos desvios. | Roteiro adaptado de 14 perguntas em linguagem simples (Anexo A). |

---

## 9. Pendências

### 9.1 Resolvidas nesta versão

| ID | Pendência | Resolução |
|---|---|---|
| **PD-01** | Modelo de processo e elementos BPMN. | O modelo é `FLUXOGRAMAS - AAD e CEU.pdf` (fluxogramas 2.1 a 2.5), já estruturado nos gabaritos de `eda_corpus/data/gabarito/`. Elementos: ver RF-20. |
| **PD-02** | Definição de "norma" no histórico de versões. | Fora do MVP. |
| **PD-03** | Ferramenta de referência para o `.bpmn`. | bpmn.io / bpmn-js. |
| **PD-04** | Layout do PDF e cabeçalho institucional. | Especificação no Anexo B. Logotipos ficam como espaço reservado (PD-07). |
| **PD-05** | Provedor e modelo de IA. | LiteLLM Proxy na VPS, com modelos por alias (PD-08). |
| **PD-06** | Recursos do editor BPMN integrado. | Recursos padrão do bpmn-js. Painel de propriedades e comentários no diagrama ficaram para depois do MVP. |

### 9.2 Em aberto

| ID | Pendência | Responsável | Impacto |
|---|---|---|---|
| **PD-07** | Logotipos oficiais (Governo do Piauí/SECTI e UFPI) e textos institucionais do PDF. | Product owner | RF-34. Até lá, o PDF usa espaços reservados. |
| **PD-08** | Modelos reais por trás dos aliases do LiteLLM. | Time de desenvolvimento | RNF-09. Não bloqueia o desenvolvimento. |

---

## 10. Riscos

- **Prazo curto (terça, 10/11).** Mitigado pelos cortes de escopo da seção 1.3 e pelo plano em `analise-mvp.md`.
- **Layout automático do BPMN.** Desvios de retorno entre raias podem ficar confusos. Mitigação: layout simples em grade (raia × ordem) e ajuste manual no editor.
- **Qualidade da geração sem análise prévia.** Respostas vagas geram diagramas incompletos. Mitigação: exemplos nas perguntas 6, 8 e 9 e editor para corrigir antes do envio.
- **Qualidade da IA sem casos de referência fixos.** A avaliação depende dos testers, então o feedback precisa ser registrado durante o uso. Os gabaritos 2.1 a 2.5 ajudam como referência.
- **Deploy tardio.** Subir a VPS (Postgres, LiteLLM, Django, nginx) no primeiro dia de desenvolvimento.
- **Configuração insegura em produção.** O settings usa `DEBUG=True` e uma `SECRET_KEY` fixa quando o `.env` não define esses valores.
- **Dados pessoais.** O `FLUXOGRAMAS - AAD e CEU.pdf` traz nomes de servidores e não deve ser versionado. A pergunta 4 da entrevista pede setores ou funções, e não nomes, para evitar enviar dados pessoais ao provedor de IA.
- **Acessibilidade sem requisito formal.** O público é de servidores públicos. Recomenda-se ao menos contraste adequado e navegação por teclado, mesmo sem exigência formal.

---

## Anexo A — Roteiro da entrevista (14 perguntas)

Adaptado de um roteiro de referência para mapeamento de processos, reescrito em linguagem simples e voltado ao que o diagrama precisa. Cada bloco abre com uma frase fixa de transição no chat. A coluna "Alimenta" indica o campo do formato intermediário (ver `analise-mvp.md`).

| # | Pergunta | Alimenta |
|---|---|---|
| **Sobre o processo** | | |
| 1 | Qual é o nome do processo? | `processo`, título do mapeamento |
| 2 | Para que serve este processo e o que ele entrega no final? | `objetivo`, saídas do resumo |
| 3 | Quem pede ou dá início ao processo (cidadão, empresa, outro setor)? | raia do requerente |
| **Quem participa** | | |
| 4 | Quais setores ou órgãos participam? Informe por setor ou função, sem nomes de pessoas. | `setores` (raias), responsáveis do resumo |
| **Passo a passo** | | |
| 5 | Como o processo começa: o que chega e por qual canal? | evento de início |
| 6 | Descreva as etapas em ordem, dizendo qual setor faz cada uma. Exemplo: "Protocolo analisa os documentos → Requerente paga a taxa → CEU encaminha à DAP". | tarefas, raia de cada tarefa, fluxos |
| 7 | Como o processo termina e quem recebe o resultado? | evento de fim, saídas do resumo |
| **Quando algo sai do normal** | | |
| 8 | O que acontece quando falta documento ou há pendência? Quem avisa, quem corrige e para qual etapa o processo volta? | gateways, fluxos condicionais |
| 9 | Existem outros caminhos, como cancelamento, indeferimento, multa ou envio a outro órgão? | gateways, fluxos condicionais |
| 10 | Existem prazos? O que acontece se não forem cumpridos? | `prazo`, observações |
| **O que é necessário** | | |
| 11 | Quais documentos o solicitante precisa apresentar? | `documentos`, entradas do resumo |
| 12 | Quais sistemas são usados (ex.: SEI)? | `sistemas` |
| 13 | Há taxas ou pagamentos? Em qual etapa? | `taxas` |
| **Fechamento** | | |
| 14 | Há algo importante sobre o processo que não foi perguntado? | observações |

---

## Anexo B — Especificação do PDF (PD-04)

| Elemento | Especificação |
|---|---|
| Papel | A4 em paisagem (297 × 210 mm), em todas as páginas. |
| Margens | Superior: 32 mm, incluindo o cabeçalho; inferior: 16 mm; laterais: 12 mm. |
| Cabeçalho repetido | Espaço reservado Governo do Piauí/SECTI à esquerda; FluxoIA e identificação do projeto ao centro; espaço reservado UFPI à direita. Abaixo, faixa com o status e a data (ex.: `APROVADO · 04/11/2026` ou `DEVOLVIDO`), sem número de versão. |
| Primeira página | Título, aviso quando não aprovado, ficha de metadados e resumo do processo. |
| Ficha de metadados | Secretaria, setor, autor, status, aprovador e data da aprovação (só se aprovado), data e hora da exportação, e quem exportou. |
| Resumo do processo | Objetivo, entradas, saídas e responsáveis, gerados pela IA e revisados pelo mapeador (RF-44). |
| Página do diagrama | Diagrama BPMN completo em uma página, com a escala reduzida para caber em A4 paisagem. Legenda opcional, gerada a partir dos tipos de elemento presentes. |
| Apêndice | Histórico de devoluções: data, chefe e comentário de cada devolução. Só aparece se houver devoluções. |
| Rodapé | Nome do sistema e tipo do documento à esquerda; "Página X de Y" à direita. |
| Tipografia | Arial, com alternativas DejaVu Sans e sans-serif. Título: 21 pt; seções: 13 pt; texto: 10 pt; notas: 8,5 pt; rodapé: 8 pt. |
| Cores | Texto #1F2937; títulos #243447; bordas #CBD5E1; fundos discretos #F1F5F9. |
| Aprovado | Verde-escuro #24543D, sempre acompanhado de texto. |
| Não aprovado | Marrom #7C3B12, aviso textual e marca d'água "NÃO APROVADO". |
| Conteúdo extenso | A ficha e as tabelas podem continuar em outras páginas. Não truncar informações para fazê-las caber. |
| Fora do MVP | Versão, norma, recortes ampliados do diagrama e assinatura digital. |

---

## Histórico do documento

| Versão | Mudanças |
|---|---|
| 0.5 | CF-01 a CF-10 resolvidos. |
| 0.6 | PD-01 a PD-06 resolvidos. Entrevista em chat com roteiro fixo de 14 perguntas (Anexo A). Análise prévia, versionamento, norma, retenção, painel de propriedades e comentários no diagrama movidos para depois do MVP. Exportação em qualquer status e especificação do PDF (Anexo B). LiteLLM Proxy como acesso aos modelos. Novos RF-39 a RF-46, RNF-14 a RNF-16, RN-10 a RN-13, US-17 a US-19 e CF-11 a CF-15. |
