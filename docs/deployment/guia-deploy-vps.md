# Guia de Deploy Nativo na VPS Contabo (Sem Docker e Sem LiteLLM)

Este guia descreve como configurar a VPS Ubuntu da Contabo e o pipeline de CI/CD do GitHub Actions para o **FluxoIA**.

---

## 1. O que roda na VPS

- **Sistema Operacional:** Ubuntu 22.04 LTS ou 24.04 LTS
- **Web Server & Proxy:** Nginx (porta 80)
- **Backend:** Python 3.12 + Gunicorn (gerenciado por `systemd`)
- **Frontend:** React + Vite (arquivos estáticos compilados em `frontend/dist/` servidos direto pelo Nginx)
- **Banco de Dados:** SQLite (padrão sem dependência extra) ou PostgreSQL local
- **IA / LLM:** Conexão direta com provedores (ex: DeepSeek ou OpenAI) sem necessidade de proxy LiteLLM

---

## 2. Passo a Passo Inicial na VPS (Feito 1 única vez)

Acesse a VPS via SSH (pelo terminal ou PuTTY):
```bash
ssh root@<IP_DA_SUA_VPS>
```

### 2.1 Atualizar o sistema e instalar dependências básicas
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx python3-pip python3-venv build-essential
```

### 2.2 Instalar Node.js (v20 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.3 Clonar o repositório em `/var/www/fluxoia`
```bash
sudo mkdir -p /var/www/fluxoia
sudo chown -R $USER:$USER /var/www/fluxoia
git clone https://github.com/SE4AI-UFPI/FluxoIA.git /var/www/fluxoia
cd /var/www/fluxoia
```

### 2.4 Criar e preencher o `.env` do Backend
Crie o arquivo `/var/www/fluxoia/backend/.env`:
```bash
cat << 'EOF' > /var/www/fluxoia/backend/.env
# Chave secreta do Django (gere uma aleatória ou deixe esta provisória)
DJANGO_SECRET_KEY=sua-chave-secreta-muito-segura-e-longa-32-chars

DJANGO_DEBUG=False
# Adicione o IP da sua VPS ou domínio:
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,<IP_DA_SUA_VPS>
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,http://<IP_DA_SUA_VPS>

# Conexão Direta com a LLM (DeepSeek ou OpenAI) sem LiteLLM
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_API_KEY=sk-sua-chave-aqui-da-deepseek
LLM_TIMEOUT=120
EOF
```

### 2.5 Configurar o Serviço Systemd (Gunicorn)
Copie o template de serviço incluído no repositório:
```bash
sudo cp /var/www/fluxoia/scripts/fluxoia.service /etc/systemd/system/fluxoia.service
sudo systemctl daemon-reload
sudo systemctl enable fluxoia
```

### 2.6 Configurar o Nginx
```bash
sudo cp /var/www/fluxoia/scripts/nginx-fluxoia.conf /etc/nginx/sites-available/fluxoia
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/fluxoia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2.7 Executar o Primeiro Deploy Manual
Rode o script para instalar tudo pela primeira vez:
```bash
chmod +x /var/www/fluxoia/scripts/deploy.sh
/var/www/fluxoia/scripts/deploy.sh
```

Pronto! Acesse no navegador: `http://<IP_DA_SUA_VPS>`

---

## 3. Configurar CI/CD com GitHub Actions

O repositório já contém o workflow [deploy.yml](file:///.github/workflows/deploy.yml). Toda vez que você der `git push origin main`, o GitHub Actions roda os testes unitários e atualiza a VPS automaticamente.

### 3.1 Gerar o par de chaves SSH para o GitHub Actions
No terminal da sua máquina local ou na própria VPS, crie uma chave dedicada para o deploy:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/deploy_key -N ""
```
Isso gera:
- `~/deploy_key` (chave privada)
- `~/deploy_key.pub` (chave pública)

Adicione a chave pública na VPS em `~/.ssh/authorized_keys`:
```bash
cat ~/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3.2 Adicionar os Segredos no GitHub
Vá no GitHub em **Settings** > **Secrets and variables** > **Actions** > **New repository secret** e cadastre:

| Nome do Secret | Valor |
| --- | --- |
| `VPS_HOST` | O IP da sua VPS Contabo (ex: `161.97.xxx.xxx`) |
| `VPS_USER` | `root` (ou o usuário configurado na VPS) |
| `VPS_SSH_KEY` | O conteúdo completo da chave privada `deploy_key` (incluindo `-----BEGIN...` e `-----END...`) |
| `VPS_PORT` | `22` (opcional, padrão 22) |

A partir daí, qualquer commit na branch `main` disparará o teste e o deploy automático na Contabo!
