# Roadmap & Milestones

Estimasi asumsi: **part-time 10-15 jam/minggu**, solo dev.

## Milestone 0 — Setup Foundation (Minggu 1)

- [ ] Init Turborepo (`apps/web`, `apps/api`, `apps/worker`, `packages/shared`)
- [ ] Setup `pnpm-workspace.yaml`, `turbo.json`, root `package.json`
- [ ] `.gitignore` + `.env.example` + git hooks (Husky + lint-staged)
- [ ] Docker Compose: Postgres 16, Redis 7, MinIO (mock R2)
- [ ] Prisma schema awal + migration pertama
- [ ] CI baseline GitHub Actions: typecheck + lint + test
- [ ] Setup Sentry projects (web, api, worker)

**Deliverable**: `docker compose up && pnpm dev` jalan, sambungan DB OK.

## Milestone 1 — Auth & User (Minggu 2)

- [ ] NextAuth.js v5 di Next.js — email magic link via SMTP (Resend free tier)
- [ ] Halaman: `/login`, `/verify`, `/settings` (enable 2FA opsional)
- [ ] NestJS auth guard validasi NextAuth JWT
- [ ] tRPC setup (Next ↔ Nest)
- [ ] Rate limit pakai Upstash Redis di `auth.sendMagicLink`
- [ ] Audit log skeleton

**Deliverable**: User bisa login pakai email, session persist, akses dashboard kosong.

## Milestone 2 — Upload Flow (Minggu 2-3)

- [ ] R2 bucket setup (atau MinIO lokal)
- [ ] `upload.presignPut` di NestJS — return presigned PUT URL
- [ ] UI upload drag-drop di Next.js (`react-dropzone` + progress)
- [ ] Validasi client-side: MIME, size
- [ ] Validasi server-side: magic bytes check setelah upload selesai
- [ ] URL input alternative — validasi domain whitelist
- [ ] Halaman config job: jumlah clip, durasi target, gaya subtitle, bahasa
- [ ] `jobs.create` endpoint → enqueue BullMQ

**Deliverable**: User bisa upload video, submit job, job muncul di queue.

## Milestone 3 — Worker Python Skeleton (Minggu 3)

- [ ] Python project pakai `uv` (`pyproject.toml`)
- [ ] FastAPI app + Celery setup (broker Redis)
- [ ] Internal HTTP client untuk update progress ke Nest API (shared secret)
- [ ] Dockerfile worker (non-root, cap-drop ALL)
- [ ] Test echo task: enqueue dari Nest → worker terima → update job status

**Deliverable**: Round-trip queue Nest → Python worker → Nest progress callback OK.

## Milestone 4 — AI Pipeline (Minggu 4-5)

### Sub-milestones

**4a. Download + Transcribe** (3 hari)
- [ ] `pipeline/download.py` — yt-dlp + fetch dari R2
- [ ] `pipeline/transcribe.py` — faster-whisper `small`, word timestamps
- [ ] Unit test dengan sample video 1 menit
- [ ] Benchmark: ukur waktu di laptop user

**4b. Scoring** (3 hari)
- [ ] Groq API client + error handling + retry
- [ ] Chunking algoritma 30-90s overlap 15s
- [ ] Scoring prompt + JSON parsing
- [ ] Non-max suppression top-N selection
- [ ] Cache hasil scoring di Redis (key = hash chunk)

**4c. Cut + Crop 9:16** (3 hari)
- [ ] FFmpeg cut by timestamp
- [ ] MediaPipe face detection sampler
- [ ] Static crop dulu (1 face center per clip) — dynamic crop fase nanti
- [ ] Resize ke 1080×1920

**4d. Subtitle + Render** (2 hari)
- [ ] Generate `.ass` dari word timestamps
- [ ] 3 preset style: bold-white, tiktok-yellow, minimal-black
- [ ] Burn subtitle FFmpeg `ass=` filter
- [ ] Generate thumbnail (frame ke-1)
- [ ] Upload clip + thumbnail ke R2

**Deliverable**: End-to-end pipeline jalan untuk 1 video sample. Hasil clip bisa di-preview di UI.

## Milestone 5 — Review UI (Minggu 6)

- [ ] Halaman `/jobs/[id]` — progress bar real-time (SSE atau polling)
- [ ] Grid view clip hasil: thumbnail, viral score, alasan, durasi
- [ ] Video player inline (HLS optional, mp4 langsung dari R2 presigned)
- [ ] Download per-clip + download all (ZIP server-side stream)
- [ ] Delete clip
- [ ] Halaman `/history` — list semua job dengan filter

**Deliverable**: User bisa selesaikan full workflow upload → review → download.

## Milestone 6 — Polish & Deploy (Minggu 7)

- [ ] Security checklist lengkap (lihat [SECURITY.md](SECURITY.md))
- [ ] Email notifikasi job selesai (>5 menit)
- [ ] Cron auto-delete clip & video 30 hari
- [ ] Error states + empty states UI
- [ ] Loading skeletons
- [ ] Mobile responsive (web view di HP)
- [ ] Deploy: Vercel (web), Railway (api), worker tetap lokal di laptop dulu
- [ ] Setup domain + HTTPS
- [ ] Smoke test production
- [ ] Buat backup script database

**Deliverable**: 🚀 **MVP v1.0 live untuk personal use**.

---

## Fase 2 — Bulan 2-3

### Mobile App Flutter
- [ ] Flutter project scaffold + shared API client dari packages/shared
- [ ] Auth flow (deep link magic link)
- [ ] Upload via mobile camera roll
- [ ] Review & download
- [ ] Share langsung ke TikTok/IG (intent native)

### Generator Script TikTok FYP
- [ ] UI form: niche, target audience, hook style
- [ ] Pipeline: scrape trending TikTok hashtag (RapidAPI / public source) → cluster topik → generate script via Claude/Groq
- [ ] Output: 5 script variation dengan format Hook-Body-CTA + caption + hashtag

### Foto + Text → Video
- [ ] Upload foto + tulis script
- [ ] Generate voice over (ElevenLabs / XTTS lokal)
- [ ] Animate foto pakai Ken Burns effect FFmpeg, atau pakai API image-to-video
- [ ] Output 9:16 dengan subtitle

---

## Fase 3 — Bulan 4+

- [ ] Self-host LLM (Ollama dengan Llama 3.3) — kurangi ketergantungan Groq
- [ ] Cloud GPU worker (RunPod serverless) untuk Whisper `large-v3`
- [ ] B-roll otomatis dari Pexels/Pixabay
- [ ] Background music library
- [ ] Auto A/B test 2 versi clip
- [ ] Analytics: track clip mana yang Anda upload, dapat insight clip seperti apa yang Anda pilih

---

## KPI per Milestone

| Milestone | KPI Sukses |
|---|---|
| M1 | Login → logout end-to-end, audit log tercatat |
| M2 | Upload 100MB video < 30 detik di koneksi 20Mbps |
| M3 | Round-trip job enqueue → status update < 2 detik |
| M4 | Video 30 menit → 5 clip dalam < 10 menit di laptop |
| M5 | UI responsive, tidak ada layout shift |
| M6 | Lighthouse score web > 90 |

## Risiko Timeline

| Risiko | Mitigasi |
|---|---|
| Whisper di CPU terlalu lambat | Sediakan opsi RunPod GPU dari awal (fitur premium) |
| Quality scoring Groq jelek | A/B prompt, mungkin perlu fine-tune prompt per niche |
| FFmpeg edge case crash | Sampling 10 video beda format saat M4 testing |
| Mobile dev makan waktu lama | Pertimbangkan PWA dulu sebelum Flutter native |
