#!/bin/bash
set -e

# ============================================
#   🐉 Alexa AI - Auto Deploy Script
#   Powered by Ollama
# ============================================

PORT=6301
MODEL=""
USE_DOCKER=false
ACTION="start"
DB_ENGINE="IndexedDB"
DB_NAME="alexa-ai-db"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port) PORT="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --docker) USE_DOCKER=true; shift ;;
    --stop) ACTION="stop"; shift ;;
    --restart) ACTION="restart"; shift ;;
    --status) ACTION="status"; shift ;;
    --help)
      echo "Usage: ./deploy.sh [options]"
      echo ""
      echo "Options:"
      echo "  --port <port>    Set port (default: 6301)"
      echo "  --model <model>  Set AI model (interactive if omitted)"
      echo "  --docker         Use Docker for deployment"
      echo "  --stop           Stop Alexa AI (kills server & optionally Ollama)"
      echo "  --restart        Restart Alexa AI"
      echo "  --status         Show current status"
      echo "  --help           Show this help"
      echo ""
      echo "Examples:"
      echo "  ./deploy.sh                      # Start with interactive model selection"
      echo "  ./deploy.sh --model llama3       # Start with llama3"
      echo "  ./deploy.sh --docker             # Deploy with Docker"
      echo "  ./deploy.sh --stop               # Stop everything"
      echo "  ./deploy.sh --stop --docker      # Stop Docker container"
      echo "  ./deploy.sh --status             # Check status"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_ok() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_err() { echo -e "${RED}❌ $1${NC}"; }
log_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# ============ STOP ============
if [ "$ACTION" = "stop" ]; then
  echo ""
  echo "🐉 ============================="
  echo "   Alexa AI - Stopping..."
  echo "==============================="
  echo ""

  if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Stopping Docker container..."
    docker compose down 2>/dev/null && log_ok "Docker container dihentikan" || log_warn "Tidak ada container berjalan"
  else
    echo "📦 Stopping local server..."
    # Kill serve process on the port
    PID=$(lsof -ti:"$PORT" 2>/dev/null)
    if [ -n "$PID" ]; then
      kill $PID 2>/dev/null
      log_ok "Server di port $PORT dihentikan (PID: $PID)"
    else
      log_warn "Tidak ada server berjalan di port $PORT"
    fi
  fi

  echo ""
  read -p "Apakah Anda ingin menghentikan Ollama juga? (y/n): " stop_ollama
  if [ "$stop_ollama" = "y" ] || [ "$stop_ollama" = "Y" ]; then
    pkill -f "ollama serve" 2>/dev/null && log_ok "Ollama dihentikan" || log_warn "Ollama tidak berjalan"
  else
    log_info "Ollama tetap berjalan"
  fi

  echo ""
  log_ok "Alexa AI telah dihentikan"
  exit 0
fi

# ============ STATUS ============
if [ "$ACTION" = "status" ]; then
  echo ""
  echo "🐉 ============================="
  echo "   Alexa AI - Status"
  echo "==============================="
  echo ""

  # Check Ollama
  if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
    log_ok "Ollama: Running"
    echo "  Models terinstall:"
    ollama list 2>/dev/null | tail -n +2 | while read -r line; do
      echo "    - $line"
    done
  else
    log_err "Ollama: Not running"
  fi

  echo ""

  # Check server
  if lsof -ti:"$PORT" > /dev/null 2>&1; then
    log_ok "Web Server: Running di port $PORT"
  else
    log_err "Web Server: Not running di port $PORT"
  fi

  # Check Docker
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "alexa-ai"; then
    log_ok "Docker: Container alexa-ai berjalan"
  fi

  # Database info
  echo ""
  log_info "Database: $DB_ENGINE (browser-based, otomatis tersedia)"
  log_info "Nama database browser: $DB_NAME"
  log_info "Data chat tersimpan di browser pengguna, tidak perlu setup tambahan"

  echo ""
  exit 0
fi

# ============ RESTART ============
if [ "$ACTION" = "restart" ]; then
  echo "🔄 Restarting Alexa AI..."
  if [ "$USE_DOCKER" = true ]; then
    docker compose restart
  else
    PID=$(lsof -ti:"$PORT" 2>/dev/null)
    [ -n "$PID" ] && kill $PID 2>/dev/null
    sleep 1
  fi
  ACTION="start"
fi

# ============ START ============
echo ""
echo "🐉 ============================="
echo "   Alexa AI - Auto Deployer"
echo "   Port: $PORT"
echo "==============================="
echo ""

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

# ---- Step 2: Start Ollama with CORS ----
echo ""
echo "🚀 Step 2: Starting Ollama..."
if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
  log_ok "Ollama sudah berjalan"
else
  OLLAMA_ORIGINS="*" ollama serve &> /dev/null &
  sleep 3
  if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
    log_ok "Ollama berhasil dijalankan (CORS enabled)"
  else
    log_err "Gagal menjalankan Ollama"
    echo ""
    log_info "Tips: Pastikan Ollama memiliki CORS yang diaktifkan."
    log_info "Set environment variable: OLLAMA_ORIGINS=*"
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
  echo "    6) gemma2       - Google Gemma 2"
  echo "    7) qwen2        - Alibaba Qwen 2"
  echo ""
  read -p "  Masukkan nama model atau nomor (1-7): " choice
  case "$choice" in
    1) MODEL="llama3" ;;
    2) MODEL="mistral" ;;
    3) MODEL="codellama" ;;
    4) MODEL="openclaw" ;;
    5) MODEL="phi3" ;;
    6) MODEL="gemma2" ;;
    7) MODEL="qwen2" ;;
    "") MODEL="llama3"; echo "  Default: llama3" ;;
    *) MODEL="$choice" ;;
  esac
  echo ""
fi

echo "🤖 Model dipilih: $MODEL"
if ollama list 2>/dev/null | grep -q "$MODEL"; then
  log_ok "Model $MODEL sudah ada"
else
  log_warn "Downloading $MODEL... (ini mungkin memakan waktu)"
  ollama pull "$MODEL"
  log_ok "Model $MODEL berhasil didownload"
fi

# ---- Step 4: Database Info ----
echo ""
echo "💾 Step 4: Database..."
log_ok "Database: IndexedDB (browser-based)"
log_info "Nama database lokal: $DB_NAME"
log_info "Data chat tersimpan otomatis di browser pengguna"
log_info "Kapasitas: Ratusan MB - GB (tergantung browser)"
log_info "Tidak perlu setup database tambahan"
log_info "localStorage hanya dipakai untuk preferensi ringan seperti model aktif"

# ---- Step 5: Deploy ----
echo ""
if [ "$USE_DOCKER" = true ]; then
  echo "🐳 Step 5: Deploying with Docker on port $PORT..."
  
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
  echo "📦 Step 5: Building & deploying on port $PORT..."
  
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
echo "   💾 Database: $DB_ENGINE ($DB_NAME)"
echo "==============================="
echo ""
echo "📌 Perintah berguna:"
echo "   ./deploy.sh --status        Cek status"
echo "   ./deploy.sh --stop          Hentikan semua"
echo "   ./deploy.sh --restart       Restart"
echo ""
echo "⚠️  PENTING: Jika akses dari jaringan lain,"
echo "   pastikan Ollama dijalankan dengan:"
echo "   OLLAMA_ORIGINS=* ollama serve"
echo ""
