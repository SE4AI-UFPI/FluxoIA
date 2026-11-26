# RB-09 — Gestão de usuários (Administrador)

## Quando usar
- Criação de contas nominais para Operacionais e Supervisores.
- Vinculação ou ajuste de setores para roteamento da fila de governança (**RB-07**).
- Revisão mensal de acessos e inativação de contas sem uso (rotina III.3).

## Regras de segurança e auditoria
- **Nunca apagar registros de usuários diretamente no banco** (`DELETE`): o sistema usa **exclusão lógica (soft delete / inativação)** para preservar a autoria histórica de processos, versões BPMN e pareceres de governança.
- **Contas nominais em produção:** contas genéricas/de teste do seed de homologação não devem existir em ambiente produtivo.
- **Segregação e vínculo de setor:** Operacional e Supervisor precisam compartilhar ao menos um setor vinculado para que os processos apareçam na fila `/governanca`.

## Procedimento pela interface web (Recomendado)

1. Faça login com uma conta de perfil **Administrador**.
2. No menu lateral, acesse **Gestão de Usuários** (`/usuarios`).
3. **Para criar novo usuário:**
   - Clique em **Novo Usuário** (`/usuarios/novo`).
   - Preencha nome, e-mail institucional, CPF e matrícula válidos, selecione o perfil (`operacional`, `supervisor` ou `administrador`) e selecione os **setores vinculados**.
   - Salve o cadastro e repasse as instruções de primeiro acesso por canal seguro.
4. **Para inativar ou reativar uma conta:**
   - Localize o usuário na listagem (`/usuarios`) usando os filtros de perfil, status ou busca.
   - Utilize a ação de **Inativar / Reativar** na própria listagem (o histórico do usuário permanece íntegro).

## Procedimento de emergência via CLI (caso não haja Admin ativo)
Para criar um superusuário/administrador inicial diretamente no backend:
```bash
docker compose exec backend python manage.py createsuperuser
```
*(Para conferência de vínculos e status em lote via Django shell, utilize o comando de consulta descrito no **RB-07**.)*
