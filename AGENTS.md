# Instruções para agentes de código

## Dependências do backend

- Ao instalar um pacote Python, atualize `backend/requirements.txt` no mesmo passo,
  com `pip freeze > backend/requirements.txt` rodado no venv do backend.
- O arquivo deve ficar em UTF-8. No PowerShell, use
  `pip freeze | Out-File -Encoding utf8 backend/requirements.txt`.
- Antes de concluir uma tarefa que mexeu em dependências, rode
  `python backend/scripts/check_requirements.py` e resolva os avisos.
