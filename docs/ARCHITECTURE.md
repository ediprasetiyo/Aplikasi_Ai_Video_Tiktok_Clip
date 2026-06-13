# Architecture & Tech Spec

## 1. System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                   USER (Web Browser / Mobile)                   │
└─────────────────────────────┬──────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼──────────────────────────────────┐
│  Next.js 15 (Vercel)                                           │
│  - App Router, Server Components                                │
│  - NextAuth.js (email magic link + optional TOTP 2FA)          │
│  - Upload via Cloudflare R2 presigned URL (bypass server)      │
└─────────────────────────────┬──────────────────────────────────┘
                              │ tRPC (typesafe)
┌─────────────────────────────▼──────────────────────────────────┐
│  NestJS API (Railway / Fly.io)                                 │
│  - Auth guard, rate limit (Upstash Redis)                       │
│  - Zod validation di semua endpoint                             │
│  - Prisma → PostgreSQL                                          │
│  - Enqueue job via BullMQ                                       │
└──────────┬───────────────────────────────────┬─────────────────┘
           │                                   │
   ┌───────▼────────┐                  ┌──────▼─────────┐
   │  PostgreSQL    │                  │  Redis         │
   │  (Supabase /   │                  │  (Upstash)     │
   │  Neon)         │                  │  Queue + cache │
   └────────────────┘                  └──────┬─────────┘
                                              │ pop job
                              ┌───────────────▼──────────────────┐
                              │  Python Worker (Docker, lokal /   │
                              │  RunPod serverless)                │
                              │  FastAPI + Celery                  │
                              │  - yt-dlp                          │
                              │  - faster-whisper (CPU)            │
                              │  - Groq API client                 │
                              │  - OpenCV + MediaPipe              │
                              │  - FFmpeg subprocess               │
                              └──────────┬───────────────────────┘
                                         │ upload hasil
                              ┌──────────▼───────────────────────┐
                              │  Cloudflare R2 (S3-compatible)    │
                              │  - source-videos/                 │
                              │  - clips/                         │
                              │  - subtitles/                     │
                              └──────────────────────────────────┘
```

## 2. Monorepo Structure (Turborepo)

```
Aplikasi_Ai_Video_Tiktok_Clip/
├── apps/
│   ├── web/                      # Next.js 15
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── upload/
│   │   │   │   ├── jobs/[id]/
│   │   │   │   └── history/
│   │   │   └── api/
│   │   └── components/
│   │
│   ├── api/                      # NestJS
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── jobs/
│   │   │   ├── clips/
│   │   │   ├── storage/          # R2 presign
│   │   │   └── queue/
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── worker/                   # Python
│       ├── src/
│       │   ├── pipeline/
│       │   │   ├── download.py
│       │   │   ├── transcribe.py
│       │   │   ├── score.py
│       │   │   ├── crop_face.py
│       │   │   ├── subtitle.py
│       │   │   └── render.py
│       │   ├── tasks.py          # Celery tasks
│       │   └── main.py
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   ├── shared/                   # Types share antar Next & Nest
│   │   └── src/types.ts
│   ├── ui/                       # shadcn components reusable
│   └── config/                   # ESLint, TS config
│
├── docker-compose.yml            # postgres + redis untuk dev
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 3. Database Schema (Prisma)

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  totpSecret    String?   // 2FA opsional, encrypted at rest
  jobs          Job[]
  auditLogs     AuditLog[]
  createdAt     DateTime  @default(now())
}

model Job {
  id            String     @id @default(cuid())
  userId        String
  user          User       @relation(fields: [userId], references: [id])

  sourceType    SourceType // UPLOAD | URL
  sourceUrl     String?    // jika URL (Drive/YT milik sendiri)
  sourceKey     String?    // R2 key jika upload
  sourceTitle   String?
  sourceDuration Int?      // detik

  config        Json       // { clipCount, targetDuration, subtitleStyle, language }
  status        JobStatus  @default(QUEUED)
  progress      Int        @default(0) // 0-100
  errorMessage  String?

  clips         Clip[]
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime   @default(now())

  @@index([userId, status])
}

model Clip {
  id          String   @id @default(cuid())
  jobId       String
  job         Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  startTime   Float    // detik di video asli
  endTime     Float
  duration    Float
  viralScore  Int      // 0-100
  reason      String   // text — "kenapa AI memilih segmen ini"
  hookLine    String?  // 10 detik pertama transcript

  videoKey    String   // R2 key clip MP4
  thumbnailKey String? // R2 key thumbnail PNG
  subtitleKey String?  // R2 key .ass / .srt

  createdAt   DateTime @default(now())
  expiresAt   DateTime // auto-cleanup setelah 30 hari

  @@index([jobId, viralScore])
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String   // LOGIN, UPLOAD, GENERATE, DOWNLOAD, DELETE
  resource  String?  // jobId / clipId
  metadata  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}

enum SourceType {
  UPLOAD
  URL
}

enum JobStatus {
  QUEUED
  DOWNLOADING
  TRANSCRIBING
  SCORING
  RENDERING
  COMPLETED
  FAILED
}
```

## 4. API Contract (tRPC routes)

```typescript
// apps/api/src/trpc/router.ts (sketch)
export const appRouter = router({
  auth: {
    sendMagicLink: publicProc.input(z.object({ email: z.string().email() })).mutation(...),
    verify: publicProc.input(z.object({ token: z.string() })).mutation(...),
    enable2FA: protectedProc.mutation(...),
  },

  upload: {
    presignPut: protectedProc
      .input(z.object({ filename: z.string(), size: z.number().max(2_147_483_648), contentType: z.string() }))
      .mutation(...), // returns { uploadUrl, key }
  },

  jobs: {
    create: protectedProc
      .input(z.object({
        sourceType: z.enum(['UPLOAD', 'URL']),
        sourceUrl: z.string().url().optional(),
        sourceKey: z.string().optional(),
        config: z.object({
          clipCount: z.number().min(1).max(10),
          targetDuration: z.number().refine(v => [15, 30, 60, 90].includes(v)),
          subtitleStyle: z.enum(['bold-white', 'tiktok-yellow', 'minimal-black']),
          language: z.enum(['auto', 'id', 'en']),
        }),
      }))
      .mutation(...),

    list: protectedProc.query(...),
    get: protectedProc.input(z.object({ id: z.string() })).query(...),
    cancel: protectedProc.input(z.object({ id: z.string() })).mutation(...),
    delete: protectedProc.input(z.object({ id: z.string() })).mutation(...),
  },

  clips: {
    listByJob: protectedProc.input(z.object({ jobId: z.string() })).query(...),
    presignDownload: protectedProc.input(z.object({ clipId: z.string() })).query(...),
    delete: protectedProc.input(z.object({ clipId: z.string() })).mutation(...),
  },
});
```

## 5. Worker Communication

API ↔ Worker via Redis (BullMQ untuk Nest, Celery untuk Python — pakai job ID sebagai correlation):

```typescript
// Nest enqueue
await this.videoQueue.add('process-video', {
  jobId: job.id,
  sourceUrl: ...,
  sourceKey: ...,
  config: ...,
});
```

Worker subscribe queue Redis yang sama, update progress via `PATCH /internal/jobs/:id/progress` (internal API dengan shared secret).

## 6. Deployment

| Service | Platform | Catatan |
|---|---|---|
| Web (Next.js) | Vercel | Free tier cukup |
| API (NestJS) | Railway / Fly.io | $5/bulan |
| PostgreSQL | Supabase free / Neon | Free tier 500MB |
| Redis | Upstash | Free tier 10k commands/hari |
| R2 Storage | Cloudflare | $0.015/GB, no egress fee |
| Worker | **Lokal di laptop** (dev) atau RunPod serverless (prod) | Pakai Tailscale untuk akses lokal dari API cloud |

**Cost estimate** (personal use, ~20 video/bulan):
- Total: **~$5-10/bulan** (Railway + sedikit R2 storage)
- Sisanya semua di free tier

## 7. Local Dev Setup

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: tiktok_clip
    ports: ['5432:5432']
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  minio:                          # S3-compatible lokal (mock R2)
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ['9000:9000', '9001:9001']
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin

volumes:
  pgdata:
```

## 8. Observability

- Logging: Pino (Nest) + structlog (Python) → stdout
- Error tracking: Sentry (free tier)
- Metrics (opsional fase 2): Prometheus + Grafana untuk worker throughput
