# 🐉 Alexa AI

> Asisten kecerdasan buatan lokal yang cantik dan powerful — didukung oleh **Ollama** dengan model yang bisa dipilih.

![Alexa AI Logo](public/logo.png)

## ✨ Fitur

- 🤖 **AI Chat Real-time** — Streaming response dari model apa pun yang tersedia di Ollama
- 💬 **Multi-Conversation** — Buat, kelola, dan hapus percakapan
- 💾 **Database Lokal** — Semua chat tersimpan di IndexedDB browser (`alexa-ai-db`)
- 🔌 **Proxy Ollama Aman** — Akses model lewat path `/api` agar tidak kena blokir Mixed Content/CORS
- 🎨 **UI Cantik** — Dark theme dengan aksen pink naga, animasi heartbeat
- 📱 **Responsive** — Berfungsi di desktop dan mobile
- ⚡ **100% Lokal** — Tidak ada data yang dikirim ke cloud
- 🐳 **Docker Ready** — Deploy dengan satu perintah
- 🆔 **ID Aman di HTTP/IP Lokal** — Chat tetap bisa dibuat meski aplikasi diakses lewat IP server biasa

## 💾 Database Lokal

Alexa AI memakai **IndexedDB** sebagai database lokal utama untuk chat.

- **Nama database:** `alexa-ai-db`
- **Object store:** `conversations`, `messages`
- **Lokasi data:** tersimpan di browser pengguna
- **Bukan localStorage:** localStorage hanya dipakai untuk preferensi ringan seperti model terpilih dan URL Ollama kustom

> **Catatan penting:** untuk aplikasi frontend lokal seperti ini, **MySQL tidak bisa dipakai langsung dari browser** tanpa service backend tambahan. Karena itu versi yang benar-benar lokal, aman, dan langsung jalan memakai **IndexedDB** sebagai database chat utama.

## 🛠️ Tech Stack

| Teknologi | Kegunaan |
|-----------|----------|
| React + TypeScript | Frontend |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animasi |
| Ollama | LLM Runtime |
| IndexedDB | Database lokal chat |
| Docker | Deployment |

## 🚀 Quick Start

```bash
chmod +x deploy.sh
./deploy.sh
```

Baca [deploy.md](deploy.md) untuk panduan lengkap.

## 🧭 Cara Kerja Koneksi Ollama

- UI tidak lagi mengakses `http://host:11434` secara langsung dari browser.
- Alexa AI memakai **reverse proxy `/api`**.
- Untuk deploy lokal biasa, proxy dijalankan lewat `vite preview`.
- Untuk Docker, proxy dijalankan lewat **Nginx** di dalam container.
- Untuk Docker di Linux, Ollama wajib listen di `0.0.0.0:11434`, bukan hanya `127.0.0.1`.

Jadi request seperti ini:

```text
/api/tags
/api/chat
```

akan diteruskan otomatis ke Ollama lokal Anda di `http://127.0.0.1:11434`.

## 📝 Lisensi

MIT License
