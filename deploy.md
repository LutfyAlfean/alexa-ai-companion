# 📦 Panduan Deploy Alexa AI

## Prasyarat

- **Node.js** v18+ 
- **Docker** & **Docker Compose** (opsional, untuk deploy container)
- **Ollama** — [Install Ollama](https://ollama.ai)

---

## 🔧 Cara 1: Deploy Manual (Tanpa Docker)

### 1. Install Ollama

```bash
# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# macOS
brew install ollama

# Windows
# Download dari https://ollama.ai/download
```

### 2. Jalankan Ollama & Download Model

```bash
# Jalankan Ollama server
ollama serve &

# Download model (pilih salah satu)
ollama pull llama3      # atau: mistral, codellama, openclaw, phi3
```

### 3. Install Dependencies & Build

```bash
# Install dependencies
npm install

# Build untuk production
npm run build

# Preview hasil build
npm run preview -- --port 6301
```

### 4. Akses Aplikasi

Buka browser: **http://localhost:6301**

---

## 🐳 Cara 2: Deploy dengan Docker

### 1. Pastikan Ollama Berjalan

Ollama harus berjalan di host machine (bukan di dalam container) karena memerlukan akses GPU:

```bash
ollama serve &
ollama pull llama3    # atau model lain: mistral, codellama, openclaw
```

### 2. Build & Jalankan Docker

```bash
# Build dan jalankan
docker compose up -d

# Atau build manual
docker build -t alexa-ai .
docker run -d -p 6301:6301 --name alexa-ai alexa-ai
```

### 3. Akses Aplikasi

Buka browser: **http://localhost:6301**

---

## ⚡ Cara 3: Deploy Otomatis (Script)

```bash
chmod +x deploy.sh
./deploy.sh
```

Script akan otomatis:
1. ✅ Mengecek dan install Ollama
2. ✅ Download model OpenClaw
3. ✅ Install dependencies
4. ✅ Build aplikasi
5. ✅ Menjalankan di port yang diinginkan (default: 6301)

### Opsi Custom

```bash
./deploy.sh --port 8080
./deploy.sh --model mistral
./deploy.sh --port 8080 --model codellama
```

Jika tidak menggunakan `--model`, script akan menampilkan menu interaktif untuk memilih model.

---

## 🔧 Konfigurasi

### Mengubah Model AI

Edit file `src/lib/ollama.ts` dan ubah default model:

```typescript
model = "openclaw"  // Ganti dengan model lain
```

### Model yang Direkomendasikan

| Model | Ukuran | Deskripsi |
|-------|--------|-----------|
| openclaw | ~4GB | Default, balanced |
| llama3 | ~4GB | Meta's Llama 3 |
| mistral | ~4GB | Mistral AI |
| codellama | ~4GB | Coding specialist |

---

## ❓ Troubleshooting

### Ollama tidak terhubung
- Pastikan Ollama berjalan: `ollama serve`
- Cek status: `curl http://localhost:11434/api/tags`

### Model tidak ditemukan
- Download model: `ollama pull openclaw`
- List model: `ollama list`

### Port sudah digunakan
- Gunakan port lain: `./deploy.sh --port 8080`
- Atau kill proses di port tersebut: `lsof -ti:6301 | xargs kill`
