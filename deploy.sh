#!/bin/bash
set -e

# ============================================
#   🐉 Alexa AI - Auto Deploy Script
#   Powered by Ollama & OpenClaw
# ============================================

PORT=6301
MODEL=""
USE_DOCKER=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port) PORT="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --docker) USE_DOCKER=true; shift ;;
    --help)
      echo "Usage: ./deploy.sh [options]"
      echo ""
      echo "Options:"
      echo "  --port <port>    Set port (default: 6301)"
      echo "  --model <model>  Set AI model (default: openclaw)"
      echo "  --docker         Use Docker for deployment"
      echo "  --help           Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo ""
echo "🐉 ============================="
echo "   Alexa AI - Auto Deployer"
echo "   Port: $PORT | Model: $MODEL"
echo "==============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_ok() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_err() { echo -e "${RED}❌ $1${NC}"; }

# ---- Step 1: Check/Install Ollama ----
echo "📦 Step 1: Checking Ollama..."
if command -v ollama &> /dev/null; then
  log_ok "Ollama sudah terinstall"
else
  log_warn "Ollama belum terinstall. Menginstall..."
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -fsSL https://ollama.ai/install.sh | sh
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install ollama 2>/dev/null || {
      log_err "Install Ollama manual: https://ollama.ai"
      exit 1
    }
  else
    log_err "OS tidak didukung. Install Ollama manual: https://ollama.ai"
    exit 1
  fi
  log_ok "Ollama berhasil diinstall"
fi

# ---- Step 2: Start Ollama ----
echo ""
echo "🚀 Step 2: Starting Ollama..."
if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
  log_ok "Ollama sudah berjalan"
else
  ollama serve &> /dev/null &
  sleep 3
  if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
    log_ok "Ollama berhasil dijalankan"
  else
    log_err "Gagal menjalankan Ollama"
    exit 1
  fi
fi

# ---- Step 3: Pull Model ----
echo ""
if [ -z "$MODEL" ]; then
  echo "🤖 Step 3: Pilih model AI..."
  echo ""
  echo "  Model yang tersedia di Ollama:"
  EXISTING=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')
  if [ -n "$EXISTING" ]; then
    echo "$EXISTING" | while read -r m; do echo "    ✅ $m"; done
  else
    echo "    (belum ada model terinstall)"
  fi
  echo ""
  echo "  Model populer:"
  echo "    1) llama3       - Meta Llama 3 (recommended)"
  echo "    2) mistral      - Mistral AI"
  echo "    3) codellama    - Coding specialist"
  echo "    4) openclaw     - OpenClaw"
  echo "    5) phi3         - Microsoft Phi-3"
  echo ""
  read -p "  Masukkan nama model atau nomor (1-5): " choice
  case "$choice" in
    1) MODEL="llama3" ;;
    2) MODEL="mistral" ;;
    3) MODEL="codellama" ;;
    4) MODEL="openclaw" ;;
    5) MODEL="phi3" ;;
    "") MODEL="llama3"; echo "  Default: llama3" ;;
    *) MODEL="$choice" ;;
  esac
  echo ""
fi

echo "🤖 Model dipilih: $MODEL"
if ollama list | grep -q "$MODEL"; then
  log_ok "Model $MODEL sudah ada"
else
  log_warn "Downloading $MODEL... (ini mungkin memakan waktu)"
  ollama pull "$MODEL"
  log_ok "Model $MODEL berhasil didownload"
fi

# ---- Step 4: Deploy ----
echo ""
if [ "$USE_DOCKER" = true ]; then
  echo "🐳 Step 4: Deploying with Docker on port $PORT..."
  
  if ! command -v docker &> /dev/null; then
    log_err "Docker tidak ditemukan. Install Docker terlebih dahulu."
    exit 1
  fi

  # Update docker-compose port if custom
  if [ "$PORT" != "6301" ]; then
    sed -i.bak "s/6301:6301/$PORT:6301/" docker-compose.yml
  fi

  docker compose up -d --build
  log_ok "Docker container berjalan"
else
  echo "📦 Step 4: Building & deploying on port $PORT..."
  
  if ! command -v node &> /dev/null; then
    log_err "Node.js tidak ditemukan. Install Node.js v18+ terlebih dahulu."
    exit 1
  fi

  # Install deps
  echo "  Installing dependencies..."
  npm install --silent

  # Build
  echo "  Building application..."
  npm run build

  # Serve
  echo "  Starting server..."
  npx serve -s dist -l "$PORT" &
  
  log_ok "Aplikasi berjalan"
fi

echo ""
echo "🐉 ============================="
echo "   Alexa AI berhasil di-deploy!"
echo "   🌐 http://localhost:$PORT"
echo "   🤖 Model: $MODEL"
echo "==============================="
echo ""
