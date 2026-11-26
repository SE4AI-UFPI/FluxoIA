# RB-07 — Processo não aparece na fila do Supervisor

## Quando usar
- Um usuário Operacional informa que submeteu um processo para validação, mas o Supervisor não visualiza o item na tela **Validação & Governança** (`/governanca`).

## Regra de negócio aplicada no servidor
Conforme a especificação técnica (Seção I.2 e FA-07), o backend filtra a fila do Supervisor pelo **setor** vinculado ao usuário e pelo **status** do processo:
- O processo só aparece na fila quando:
  1. Seu status está em `aguardando_validacao` (*Aguardando Validação do Gestor*).
  2. O **Operacional** (ou o `setor` do processo) e o **Supervisor** possuem o **mesmo setor** vinculado no cadastro de usuários.

## Procedimento de verificação

### 1. Conferir setor e status do processo no banco (ou via painel Admin)
Conecte ao banco `fluxoia`:
```bash
docker compose exec db psql -U "${POSTGRES_USER:-fluxoia}" -d fluxoia -c "
SELECT p.codigo, p.nome, p.setor, p.status, u.email AS autor_email
FROM processos p
JOIN usuarios u ON u.id = p.criado_por_id
ORDER BY p.atualizado_em DESC
LIMIT 15;"
```
*(Caso o nome da tabela de usuários no banco seja `core_user` ou `usuarios`, consulte `\dt` no `psql` ou verifique via Django shell abaixo.)*

### 2. Conferir setores vinculados ao Supervisor via Django shell (alternativa segura)
```bash
docker compose exec backend python manage.py shell -c "
from core.models import User, Processo
for u in User.objects.filter(papel='supervisor'):
    print(u.email, '| ativo:', u.is_active, '| setores:', getattr(u, 'setores', None))
for p in Processo.objects.order_by('-atualizado_em')[:10]:
    print(p.codigo, '| status:', p.status, '| setor:', p.setor)
"
```

### 3. Corrigir a causa encontrada
- **Se o status ainda estiver como `rascunho`, `em_entrevista`, `em_modelagem` ou `em_avaliacao`:** o Operacional ainda não concluiu o envio. Oriente-o a finalizar a Etapa 4 e clicar em **"Submeter para Validação"**.
- **Se o setor do processo for diferente dos setores do Supervisor:** um **Administrador** deve acessar `/usuarios`, editar o cadastro do Supervisor e vincular o setor correspondente (ou corrigir o vínculo de setor do usuário — **RB-09**).
- **Se o Supervisor estiver inativo (`is_active=False`):** reativar a conta pelo perfil Administrador (**RB-09**).
