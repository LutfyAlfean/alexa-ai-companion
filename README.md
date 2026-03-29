# 🐉 Alexa AI

> Asisten kecerdasan buatan lokal yang cantik dan powerful — didukung oleh **Ollama** dengan model yang bisa dipilih.

![Alexa AI Logo](public/logo.png)

## ✨ Fitur

- 🤖 **AI Chat Real-time** — Streaming response dari model apa pun yang tersedia di Ollama
- 💬 **Multi-Conversation** — Buat, kelola, dan hapus percakapan
- 💾 **Database Lokal** — Semua chat tersimpan di IndexedDB browser (`alexa-ai-db`)
- 🎨 **UI Cantik** — Dark theme dengan aksen pink naga, animasi heartbeat
- 📱 **Responsive** — Berfungsi di desktop dan mobile
- ⚡ **100% Lokal** — Tidak ada data yang dikirim ke cloud
- 🐳 **Docker Ready** — Deploy dengan satu perintah

## 💾 Database Lokal

Alexa AI memakai **IndexedDB** sebagai database lokal utama untuk chat.

- **Nama database:** `alexa-ai-db`
- **Object store:** `conversations`, `messages`
- **Lokasi data:** tersimpan di browser pengguna
- **Bukan localStorage:** localStorage hanya dipakai untuk preferensi ringan seperti model terpilih dan URL Ollama kustom

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

## 📝 Lisensi

MIT License
