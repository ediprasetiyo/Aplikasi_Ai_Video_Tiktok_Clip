# Product Requirements Document (PRD)

## 1. Vision

Otomatis mengubah video panjang (podcast, livestream, webinar 30 menit – 3 jam) menjadi 5-10 clip pendek 30-60 detik yang siap upload ke TikTok, Instagram Reels, dan YouTube Shorts dengan kualitas viral-ready.

## 2. Target User

- **Persona utama**: Content creator / podcaster individual yang punya video panjang dan ingin repurpose ke short-form
- **Sekunder**: Tim kecil yang manage 1-3 channel
- **Bukan target di MVP**: Agency multi-klien, SaaS publik

## 3. Problem Statement

Manual clipping video panjang menjadi pendek butuh 2-4 jam per video:
1. Tonton ulang seluruh video → pilih momen menarik
2. Cut di editor (Premiere/CapCut)
3. Re-frame jadi 9:16
4. Tambah subtitle manual
5. Bikin hook 3 detik pertama

Tool seperti Opus Clip / Vizard ada, tapi **berbayar $9-29/bulan** dan kuota terbatas. Untuk personal use, lebih ekonomis self-host dengan tool gratis.

## 4. User Stories (Fase 1 MVP)

### Story 1: Upload & Process
> Sebagai creator, saya ingin upload video MP4 (max 2GB) atau paste URL Google Drive saya, lalu mendapat notifikasi ketika clip siap.

**Acceptance criteria:**
- Support drag-drop upload + URL input
- Validasi: format MP4/MOV/MKV/WebM, durasi max 3 jam, ukuran max 2GB
- Progress bar real-time (upload → transcribe → score → render)
- Email notifikasi ketika selesai (kalau processing >5 menit)

### Story 2: Pilih Konfigurasi Clip
> Sebagai creator, saya ingin pilih jumlah clip (1-10), durasi target (15-90 detik), dan gaya subtitle sebelum AI mulai memproses.

**Acceptance criteria:**
- Jumlah clip: slider 1-10 (default 5)
- Durasi target: 15s / 30s / 60s / 90s
- Gaya subtitle: 3 preset (Bold White, TikTok Yellow, Minimal Black)
- Bahasa transcribe: Auto-detect / Indonesia / English

### Story 3: Review & Download
> Sebagai creator, saya ingin preview tiap clip yang dihasilkan AI lengkap dengan **alasan kenapa AI memilih momen itu**, lalu download yang saya suka.

**Acceptance criteria:**
- Grid view semua clip dengan thumbnail
- Tiap clip ada metadata: timestamp asal, durasi, viral score (0-100), alasan (text)
- Player preview inline
- Download per-clip atau download all (ZIP)
- Hapus clip yang tidak suka

### Story 4: History
> Sebagai user, saya ingin lihat semua job processing sebelumnya dan re-download clip.

**Acceptance criteria:**
- List job: judul video, tanggal, jumlah clip, status
- Filter by status (processing, done, failed)
- Auto-delete clip setelah 30 hari (hemat storage)

## 5. Non-Functional Requirements

| Aspek | Target |
|---|---|
| Processing time | Video 1 jam → 5 clip selesai dalam **< 15 menit** (di laptop CPU) |
| Akurasi transcribe Indonesia | > 90% WER |
| Quality clip | Minimal 720p, audio sync, subtitle word-level akurat |
| Uptime | Best effort (personal use, bukan SLA komersial) |
| Security | Lihat [SECURITY.md](SECURITY.md) |

## 6. Out of Scope (Fase 1)

- ❌ Multi-user / sharing antar account
- ❌ Billing / paket berbayar
- ❌ Edit clip manual di dalam app (cukup hasil download, edit lanjutan di CapCut)
- ❌ Auto-upload langsung ke TikTok/IG (API mereka rumit + risiko ban)
- ❌ Background music / sound effect library
- ❌ Translate ke bahasa lain
- ❌ Self-hosted LLM (Ollama) — pakai Groq cloud dulu, lebih cepat di CPU laptop

## 7. Success Metrics

Karena ini personal tool, metrics-nya:
- Bisa proses minimal 5 video per minggu tanpa crash
- Hemat ≥ 80% waktu vs manual clipping
- Minimal 30% clip yang dihasilkan benar-benar dipakai user (jadi diupload)

## 8. Risks & Mitigations

| Risk | Mitigasi |
|---|---|
| Whisper di CPU lambat | Pakai model `small` (~1GB), bukan `large-v3`. Bisa upgrade ke GPU/cloud nanti |
| Groq rate limit | Fallback ke Groq model lain (Llama 3.1 8B) atau cache hasil scoring |
| FFmpeg crash di video aneh | Validasi durasi/codec pre-processing, log error detail |
| Disk penuh (video gede) | Auto-cleanup video source setelah render selesai, retention 30 hari |
| Quality clip jelek (AI salah pilih) | UI tunjukkan **kenapa** AI pilih segmen itu → user bisa filter manual |
