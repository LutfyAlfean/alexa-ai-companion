# 📦 Panduan Deploy Alexa AI

## Prasyarat

- **Node.js** v18+ 
- **Docker** & **Docker Compose** (opsional, untuk deploy container)
- **Ollama** — [Install Ollama](https://ollama.ai)

---

## 💾 Database

Alexa AI menggunakan **IndexedDB** sebagai database lokal:

| Fitur | Detail |
|-------|--------|
| Tipe | IndexedDB (browser-based) |
| Nama DB | `alexa-ai-db` |
| Library | `idb` (wrapper IndexedDB) |
| Kapasitas | Ratusan MB - GB (tergantung browser) |
| Setup | Otomatis, tidak perlu konfigurasi |
| Persistensi | Data tersimpan di browser pengguna |
| Struktur | 2 object store: `conversations` & `messages` |

### Cara Kerja Database

- **Otomatis**: Database dibuat otomatis saat pertama kali membuka aplikasi
- **Persistent**: Data tetap tersimpan meskipun browser ditutup
- **Per-browser**: Setiap browser memiliki database sendiri
- **Bukan localStorage**: Chat utama disimpan di IndexedDB, localStorage hanya untuk preferensi ringan
- **Hapus data**: Buka DevTools → Application → IndexedDB → hapus `alexa-ai-db`

### Catatan Tentang MySQL

Alexa AI saat ini adalah aplikasi **frontend lokal**. Karena itu browser **tidak bisa terhubung langsung ke MySQL** tanpa backend/API tambahan.

Supaya aplikasi benar-benar bisa dipakai lokal, implementasi yang aktif dipakai adalah:

- **Chat database:** IndexedDB (`alexa-ai-db`)
- **AI runtime:** Ollama lokal
- **Koneksi AI:** reverse proxy `/api`

Ini adalah arsitektur yang paling stabil untuk mode lokal penuh.

---

## 🔧 Cara 1: Deploy Manual (Tanpa Docker)

### 1. Install & Jalankan Ollama

```bash
# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# macOS
brew install ollama

# Jalankan Ollama (PENTING: enable CORS untuk akses jaringan)
OLLAMA_ORIGINS=* ollama serve &

# Download model (pilih salah satu)
ollama pull llama3      # atau: mistral, codellama, phi3, gemma2, qwen2
```

### 2. Install Dependencies & Build

```bash
npm install
npm run build
OLLAMA_PROXY_TARGET=http://127.0.0.1:11434 npm run preview -- --host 0.0.0.0 --port 6301
```

### 3. Akses Aplikasi

Buka browser: **http://localhost:6301**

---

## 🐳 Cara 2: Deploy dengan Docker

### 1. Pastikan Ollama Berjalan

```bash
# PENTING: Jalankan dengan CORS untuk akses dari container
OLLAMA_ORIGINS=* ollama serve &
ollama pull llama3    # atau model lain
```

### 2. Build & Jalankan Docker

```bash
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
2. ✅ Menjalankan Ollama dengan CORS enabled
3. ✅ Memilih model AI (interaktif atau via `--model`)
4. ✅ Setup database (IndexedDB, otomatis)
5. ✅ Build dan deploy aplikasi

### Opsi Lengkap

```bash
# Start
./deploy.sh                        # Interactive model selection
./deploy.sh --model llama3         # Langsung pakai llama3
./deploy.sh --port 8080            # Custom port
./deploy.sh --docker               # Deploy via Docker
./deploy.sh --model mistral --docker  # Docker + custom model

# Stop
./deploy.sh --stop                 # Stop server + opsi stop Ollama
./deploy.sh --stop --docker        # Stop Docker container

# Lainnya
./deploy.sh --restart              # Restart aplikasi
./deploy.sh --status               # Cek status semua service
./deploy.sh --help                 # Tampilkan bantuan
```

---

## 🌐 Akses dari Jaringan Lain

Jika ingin mengakses Alexa AI dari komputer/HP lain di jaringan yang sama:

1. **Jalankan Ollama dengan CORS:**
   ```bash
   OLLAMA_ORIGINS=* ollama serve
   ```

2. **Buka firewall** untuk port `6301` (web) dan `11434` (Ollama):
   ```bash
   # Linux (ufw)
   sudo ufw allow 6301
   sudo ufw allow 11434

   # Linux (firewalld)
   sudo firewall-cmd --add-port=6301/tcp --permanent
   sudo firewall-cmd --add-port=11434/tcp --permanent
   sudo firewall-cmd --reload
   ```

3. **Akses** dari browser: `http://<IP-SERVER>:6301`

Aplikasi otomatis mendeteksi hostname dan menghubungkan ke Ollama di server yang sama.

Namun pada versi terbaru, koneksi default web app memakai **proxy `/api`**, sehingga browser tidak lagi mengakses port `11434` secara langsung.

---

## 🔧 Konfigurasi

### Mengubah Model AI

Pilih model dari dropdown di header aplikasi, atau edit default di `src/lib/ollama.ts`.

### Model yang Direkomendasikan

| Model | Ukuran | Deskripsi |
|-------|--------|-----------|
| llama3 | ~4GB | Meta's Llama 3 (recommended) |
| mistral | ~4GB | Mistral AI |
| codellama | ~4GB | Coding specialist |
| phi3 | ~2GB | Microsoft Phi-3 (ringan) |
| gemma2 | ~5GB | Google Gemma 2 |
| qwen2 | ~4GB | Alibaba Qwen 2 |

### Mengubah URL Ollama

Secara default, aplikasi menggunakan **proxy `/api`**. Jika Ollama berjalan di server berbeda dan Anda ingin override manual, atur via localStorage di console browser:

```javascript
localStorage.setItem("alexa-ollama-url", "http://192.168.1.100:11434");
location.reload();
```

Untuk kembali ke mode default proxy:

```javascript
localStorage.removeItem("alexa-ollama-url");
location.reload();
```

---

## ❓ Troubleshooting

### Status "Offline"

1. Pastikan Ollama berjalan: `curl http://localhost:11434/api/tags`
2. Jika akses remote, pastikan CORS diaktifkan: `OLLAMA_ORIGINS=* ollama serve`
3. Pastikan firewall membuka port `11434`
4. Jika deploy manual, jalankan web dengan `vite preview`, bukan static server biasa tanpa proxy
5. Jika deploy Docker, pastikan container bisa mengakses `host.docker.internal:11434`

### Tidak bisa kirim pesan
- Pastikan status "Online" di header
- Pastikan model sudah dipilih dan ada di Ollama: `ollama list`
- Jika input terasa terkunci, tekan **Chat Baru** atau tunggu request timeout selesai
- Versi terbaru sudah mengizinkan tetap mengetik saat request ke Ollama sedang berlangsung

### Model tidak ditemukan
- Download model: `ollama pull llama3`
- List model: `ollama list`

### Port sudah digunakan
- Gunakan port lain: `./deploy.sh --port 8080`
- Atau kill proses: `lsof -ti:6301 | xargs kill`

### Database (IndexedDB)
- Buka DevTools → Application → IndexedDB → `alexa-ai-db`
- Store yang dipakai: `conversations` dan `messages`
- Chat tidak disimpan di localStorage
- localStorage hanya dipakai untuk model aktif dan override URL Ollama
- Untuk reset: hapus database di DevTools atau jalankan `chatDB.clearAll()` di console
