#!/usr/bin/env bash
# ==============================================================================
# FluxoIA - Script de Deploy Automático para Ubuntu VPS (Sem Docker)
# ==============================================================================
set -euo pipefail

# Diretório raiz do projeto (onde o script está localizado)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Iniciando deploy do FluxoIA em: ${PROJECT_ROOT}"
cd "${PROJECT_ROOT}"

# 1. Atualizar repositório Git
echo "==> Sincronizando código com origin/main..."
git fetch origin main
git reset --hard origin/main

# 2. Configurar backend Python
echo "==> Configurando Backend (Python venv)..."
if [ ! -d "backend/venv" ]; then
    echo "    Criando ambiente virtual em backend/venv..."
    python3 -m venv backend/venv
fi

source backend/venv/bin/activate

echo "    Instalando/atualizando dependências Python..."
pip install --upgrade pip --quiet
pip install -r backend/requirements.txt --quiet

echo "    Executando migrações do banco de dados..."
python backend/manage.py migrate --noinput

echo "    Coletando arquivos estáticos..."
python backend/manage.py collectstatic --noinput

deactivate

# 3. Configurar frontend Node.js / React
echo "==> Compilando Frontend (React/Vite)..."
cd "${PROJECT_ROOT}/frontend"

if [ -f "package-lock.json" ]; then
    npm ci --silent
else
    npm install --silent
fi

npm run build
cd "${PROJECT_ROOT}"

# 4. Reiniciar serviços no sistema
echo "==> Reiniciando serviços do sistema..."
if systemctl is-active --quiet fluxoia; then
    sudo systemctl restart fluxoia
    echo "    Serviço 'fluxoia' (Gunicorn) reiniciado com sucesso."
else
    echo "    [AVISO] Serviço 'fluxoia' ainda não existe ou não está ativo no systemd."
    echo "    Se for o primeiro deploy, configure /etc/systemd/system/fluxoia.service."
fi

if systemctl is-active --quiet nginx; then
    sudo systemctl reload nginx
    echo "    Nginx recarregado com sucesso."
else
    echo "    [AVISO] Nginx não está ativo."
fi

echo "==> Deploy concluído com sucesso!"
