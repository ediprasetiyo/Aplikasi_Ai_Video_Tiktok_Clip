# AI Video Tiktok Clip

Tool AI untuk membuat clip viral pendek (TikTok, Reels, Shorts) secara otomatis dari video panjang milik sendiri (podcast, livestream, webinar, vlog).

> **Penggunaan:** Personal / tim kecil. Bukan untuk re-upload video orang lain tanpa izin.

## Fitur (Fase 1 — MVP)

- 📥 Upload video panjang (mp4/mov/mkv) atau paste URL video Anda di YouTube/Drive
- 🎙️ Auto-transcribe dengan Whisper (timestamp per kata, support Bahasa Indonesia & Inggris)
- 🧠 AI scoring — pilih 5-10 momen paling potensial viral berdasarkan hook, emosi, quotability
- ✂️ Auto cut + crop 9:16 dengan face tracking (wajah selalu di frame)
- 📝 Auto subtitle bergaya viral (CapCut-style, kata per kata highlight)
- 📤 Download hasil clip MP4 siap upload

## Fitur (Fase 2)

- 📱 Mobile app Flutter (Android/iOS) — share langsung ke TikTok/IG
- 📜 Generator script TikTok FYP berdasarkan niche
- 🖼️ Foto + text → video pendek dengan voice over (image-to-video)
- 🔊 Voice cloning untuk dubbing multi-bahasa

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend Web | Next.js 15, TypeScript, Tailwind, shadcn/ui |
| Backend API | NestJS 11, Prisma, PostgreSQL |
| AI Worker | Python 3.12, FastAPI, Celery |
| Queue / Cache | Redis (BullMQ + Celery broker) |
| Storage | Cloudflare R2 (S3-compatible) |
| Mobile (Fase 2) | Flutter 3 |
| Infra | Docker Compose (dev), Vercel + Railway (prod) |

## AI Services (Gratis / Murah)

| Kebutuhan | Tool | Biaya |
|---|---|---|
| Transcribe | `faster-whisper` (model `small` atau `medium` di CPU) | Rp 0 |
| Scoring viral moment | Groq API (Llama 3.3 70B) | Rp 0 (free tier 14.4k req/hari) |
| Face tracking | MediaPipe Face Detection | Rp 0 |
| Video processing | FFmpeg | Rp 0 |
| Download video | yt-dlp | Rp 0 |

## Dokumentasi

- [PRD — Product Requirements](docs/PRD.md)
- [Architecture — System Design](docs/ARCHITECTURE.md)
- [AI Pipeline — Detail Worker](docs/AI_PIPELINE.md)
- [Security — Threat Model & Checklist](docs/SECURITY.md)
- [Roadmap — Timeline & Milestones](docs/ROADMAP.md)

## Setup (akan datang)

```bash
# Prerequisites: Node 20+, Python 3.12+, Docker Desktop, FFmpeg
git clone https://github.com/ediprasetiyo/Aplikasi_Ai_Video_Tiktok_Clip.git
cd Aplikasi_Ai_Video_Tiktok_Clip
docker compose up -d           # postgres + redis
pnpm install && pnpm dev       # frontend + backend
cd worker && uv sync && uv run dev  # python worker
```

## Lisensi

Private — internal use only.
