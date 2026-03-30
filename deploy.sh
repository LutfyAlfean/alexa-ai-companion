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

is_ollama_running() {
  curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1
}

is_ollama_publicly_bound() {
  ss -ltn 2>/dev/null | grep -Eq '(:11434\s)|(:11434$)' && ss -ltn 2>/dev/null | grep -Eq '0\.0\.0\.0:11434|\[::\]:11434|\*:11434'
}

start_ollama_server() {
  OLLAMA_HOST="0.0.0.0" OLLAMA_ORIGINS="*" nohup ollama serve >/tmp/alexa-ai-ollama.log 2>&1 &
}

stop_ollama_server() {
  pkill -f "ollama serve" 2>/dev/null || true
}

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
  if is_ollama_running; then
    log_ok "Ollama: Running"
    if is_ollama_publicly_bound; then
      log_ok "Ollama bind: 0.0.0.0 / network-accessible"
    else
      log_warn "Ollama bind: hanya localhost (Docker tidak akan bisa akses)"
    fi
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
  log_info "Koneksi Ollama lewat reverse proxy /api"

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
if is_ollama_running; then
  if [ "$USE_DOCKER" = true ] && ! is_ollama_publicly_bound; then
    log_warn "Ollama sedang berjalan tapi hanya listen di localhost. Restart agar Docker bisa mengakses..."
    stop_ollama_server
    sleep 2
    start_ollama_server
  else
    log_ok "Ollama sudah berjalan"
  fi
else
  start_ollama_server
  sleep 3
  if is_ollama_running; then
    log_ok "Ollama berhasil dijalankan (CORS enabled)"
  else
    log_err "Gagal menjalankan Ollama"
    echo ""
    log_info "Tips: Pastikan Ollama memiliki CORS yang diaktifkan."
    log_info "Set environment variable: OLLAMA_ORIGINS=*"
    exit 1
  fi
fi

if [ "$USE_DOCKER" = true ] && ! is_ollama_publicly_bound; then
  log_err "Ollama belum listen di 0.0.0.0:11434, jadi container tidak bisa melihatnya"
  log_info "Coba jalankan ulang dengan: pkill -f 'ollama serve' && OLLAMA_HOST=0.0.0.0 OLLAMA_ORIGINS='*' ollama serve"
  exit 1
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
  echo "  Model populer (pilih sesuai RAM server):"
    echo ""
    echo "    --- RAM 2-3 GB ---"
    echo "    1) tinyllama    - TinyLlama (~1.1 GB RAM) ⭐ untuk server kecil"
    echo "    2) phi          - Microsoft Phi-2 (~1.7 GB RAM)"
    echo ""
    echo "    --- RAM 4-6 GB ---"
    echo "    3) llama3       - Meta Llama 3 (~4.6 GB RAM)"
    echo "    4) mistral      - Mistral AI (~4 GB RAM)"
    echo "    5) codellama    - Coding specialist (~4 GB RAM)"
    echo ""
    echo "    --- RAM 6+ GB ---"
    echo "    6) gemma2       - Google Gemma 2 (~5 GB RAM)"
    echo "    7) qwen2        - Alibaba Qwen 2 (~4 GB RAM)"
    echo "    8) openclaw     - OpenClaw"
    echo ""
    # Detect available RAM
    if command -v free &>/dev/null; then
      TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
      AVAIL_RAM_MB=$(free -m | awk '/^Mem:/{print $7}')
      echo -e "    ${CYAN}ℹ️  RAM server: Total ${TOTAL_RAM_MB}MB | Tersedia ${AVAIL_RAM_MB}MB${NC}"
      if [ "$AVAIL_RAM_MB" -lt 3500 ] 2>/dev/null; then
        echo -e "    ${YELLOW}⚠️  RAM terbatas! Disarankan pilih tinyllama atau phi${NC}"
      fi
      echo ""
    fi
    read -p "  Masukkan nama model atau nomor (1-8): " choice
    case "$choice" in
    1) MODEL="tinyllama" ;;
    2) MODEL="phi" ;;
    3) MODEL="llama3" ;;
    4) MODEL="mistral" ;;
    5) MODEL="codellama" ;;
    6) MODEL="gemma2" ;;
    7) MODEL="qwen2" ;;
    8) MODEL="openclaw" ;;
    "") MODEL="tinyllama"; echo "  Default: tinyllama (cocok untuk RAM terbatas)" ;;
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
log_info "Aplikasi mengakses Ollama lewat /api agar tidak kena blokir browser"

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

  # Serve with Vite preview proxy
  echo "  Starting preview server with Ollama proxy..."
  OLLAMA_PROXY_TARGET="http://127.0.0.1:11434" npm run preview -- --host 0.0.0.0 --port "$PORT" &
  
  log_ok "Aplikasi berjalan"
fi

echo ""
echo "🐉 ============================="
echo "   Alexa AI berhasil di-deploy!"
echo "   🌐 http://localhost:$PORT"
echo "   🤖 Model: $MODEL"
echo "   💾 Database: $DB_ENGINE ($DB_NAME)"
echo "   🔌 Ollama Proxy: /api -> http://127.0.0.1:11434"
if [ "$USE_DOCKER" = true ]; then
echo "   🐳 Docker butuh Ollama listen di 0.0.0.0:11434"
fi
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
