# Security — Threat Model & Checklist

> Prinsip: meskipun ini personal tool, tetap defense-in-depth. Banyak breach SaaS terjadi karena owner asumsi "nobody knows my URL".

## 1. Threat Model

### Assets yang dilindungi
- **Akun user** (kredensial, sesi)
- **Video source** (mungkin konten belum publik — podcast unreleased, internal training)
- **Clip output** (sebelum dipublish)
- **API keys** (Groq, R2, SMTP)
- **Database** (transcript, metadata)

### Threat actors
| Actor | Motivasi | Skill | Mitigasi utama |
|---|---|---|---|
| Script kiddie | Iseng, vuln scanner | Low | Rate limit, WAF, no default creds |
| Credential stuffing bot | Akun takeover | Low-Med | 2FA, password-less auth |
| Targeted attacker | Curi video belum publish, doxx | High | Encryption at rest + transit, audit log, MFA |
| Insider (kalau ada co-admin) | Salah hapus / abuse | — | Audit log, least privilege |
| Supply chain (npm/pypi malware) | Sisipi backdoor | High | Dependency pin, Dependabot, lockfile audit |

## 2. Authentication & Session

✅ **Wajib**
- Pakai **NextAuth.js v5** dengan **email magic link** (passwordless = eliminasi seluruh kelas serangan password)
- Token magic link: random 32 byte, single-use, expire 10 menit
- Session: JWT dengan rotasi tiap 24 jam, refresh token httpOnly + Secure + SameSite=Lax
- **2FA TOTP opsional** (tapi recommended) — pakai library `otplib`
- Brute force protection: max 5 percobaan magic link per email per 15 menit
- Logout server-side invalidate session (jangan cuma clear cookie client)

❌ **Hindari**
- Password tradisional (kalau terpaksa, MIN bcrypt cost 12 + zxcvbn check)
- Sosial login di MVP (tambah attack surface)
- "Remember me" forever (max 30 hari, force re-auth)

## 3. Authorization

- Setiap query Prisma **WAJIB filter by userId** dari session. Contoh:
  ```ts
  // ❌ JANGAN
  await prisma.job.findUnique({ where: { id } });

  // ✅ HARUS
  await prisma.job.findFirst({ where: { id, userId: ctx.user.id } });
  ```
- IDOR (Insecure Direct Object Reference) check otomatis: pakai middleware tRPC yang validasi ownership sebelum handler dieksekusi
- File akses R2: WAJIB pakai presigned URL dengan expiry max 1 jam, jangan public bucket

## 4. Input Validation

✅ **Semua endpoint pakai Zod schema** — frontend validation bukan security boundary.

Khusus untuk fitur ini:

### Upload file
```typescript
const ALLOWED_MIMES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];
const MAGIC_BYTES = {
  'video/mp4': [0x66, 0x74, 0x79, 0x70],      // "ftyp" at offset 4
  // ...
};

async function validateUpload(file: Buffer, claimedType: string) {
  if (!ALLOWED_MIMES.includes(claimedType)) throw new Error('Unsupported');
  // CEK MAGIC BYTES — jangan trust ekstensi/header
  const offset = 4;
  const actual = Array.from(file.slice(offset, offset + 4));
  if (!arrayMatches(actual, MAGIC_BYTES[claimedType])) {
    throw new Error('File content mismatch');
  }
  // Scan virus opsional
  if (process.env.CLAMAV_HOST) await clamavScan(file);
}
```

### URL ingest
```typescript
const ALLOWED_HOSTS = [
  'youtube.com', 'youtu.be', 'www.youtube.com',
  'drive.google.com',
  'dropbox.com',
];

function validateSourceUrl(raw: string) {
  const url = new URL(raw);                       // throws kalau invalid
  if (url.protocol !== 'https:') throw new Error('HTTPS only');
  if (!ALLOWED_HOSTS.includes(url.hostname)) throw new Error('Host not allowed');
  // CEGAH SSRF: resolve DNS, tolak kalau private IP
  // (di worker layer juga)
}
```

⚠️ **SSRF defense di worker Python**: sebelum `yt-dlp` download, resolve URL dan cek IP target bukan:
- 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (link-local AWS metadata)
- IPv6 setara

```python
import ipaddress, socket
def is_safe_url(url: str) -> bool:
    host = urlparse(url).hostname
    for fam, _, _, _, sockaddr in socket.getaddrinfo(host, None):
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local: return False
    return True
```

## 5. Rate Limiting

Pakai **Upstash Redis rate limiter** (free tier cukup).

| Endpoint | Limit | Window |
|---|---|---|
| `auth.sendMagicLink` | 5 per email | 15 menit |
| `auth.verify` | 10 per IP | 5 menit |
| `upload.presignPut` | 10 per user | 1 jam |
| `jobs.create` | 5 per user | 1 jam |
| Global per IP | 100 req | 1 menit |

## 6. Secrets Management

❌ **JANGAN PERNAH**
- Commit `.env`, `.env.local`, atau file dengan API key ke git
- Hardcode API key di source
- Pakai env var yang sama untuk dev & prod
- Log isi env var

✅ **YANG BENAR**
- Dev: `.env.local` di-`.gitignore`, copy dari `.env.example` template
- Prod: pakai **Doppler** atau **Infisical** (free), atau secret manager platform (Railway, Vercel)
- Rotate API key tiap 90 hari (Groq, R2, SMTP)
- API key R2: **scope per-bucket dengan least privilege** (bukan account-level)

`.env.example` template:
```bash
DATABASE_URL=postgresql://localhost:5432/tiktok_clip
NEXTAUTH_SECRET=<32-byte-random-base64>
NEXTAUTH_URL=http://localhost:3000
GROQ_API_KEY=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=tiktok-clips
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
INTERNAL_API_SECRET=<shared between API and worker>
```

## 7. Encryption

| Data | At rest | In transit |
|---|---|---|
| Database (Postgres) | Provider-level encryption (Supabase/Neon default) | TLS 1.2+ |
| R2 storage | R2 default AES-256 | TLS 1.2+ |
| `totpSecret` di DB | Encrypted dengan AES-256-GCM (key dari KMS / env) | — |
| Magic link token | Hash dengan SHA-256 sebelum disimpan | — |
| Backup | Encrypted before upload | — |

## 8. HTTP Headers

Wajib di Next.js (`next.config.js` headers atau middleware):

```typescript
// middleware.ts
response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
response.headers.set('Content-Security-Policy',
  "default-src 'self'; " +
  "img-src 'self' data: https://*.r2.cloudflarestorage.com; " +
  "media-src 'self' https://*.r2.cloudflarestorage.com; " +
  "script-src 'self' 'unsafe-inline'; " +    // tighten kalau bisa
  "style-src 'self' 'unsafe-inline'; " +
  "connect-src 'self' https://*.upstash.io;"
);
```

CORS NestJS:
```typescript
app.enableCors({
  origin: process.env.NEXTAUTH_URL,    // single trusted origin
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

## 9. CSRF & XSS

- **CSRF**: tRPC pakai POST + custom header `x-trpc-source` = auto-protected, plus SameSite=Lax cookie
- **XSS**: React auto-escape, JANGAN pakai `dangerouslySetInnerHTML`. Subtitle text yang user lihat di preview tetap di-escape.
- **Template injection**: kalau email pakai HTML template, sanitize variable dengan `dompurify`

## 10. Audit Log

Log setiap aksi material ke tabel `AuditLog`:

```typescript
@Injectable()
export class AuditService {
  async log(userId: string, action: string, resource?: string, meta?: any, ctx?: { ip, ua }) {
    await this.prisma.auditLog.create({
      data: { userId, action, resource, metadata: meta, ipAddress: ctx?.ip, userAgent: ctx?.ua },
    });
  }
}
```

Aksi yang HARUS dilog:
- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
- ENABLE_2FA, DISABLE_2FA
- UPLOAD_VIDEO, CREATE_JOB, DELETE_JOB
- DOWNLOAD_CLIP
- DELETE_CLIP

Retention: 1 tahun. Backup offsite.

## 11. Dependency Security

- **Lockfile commit**: `pnpm-lock.yaml`, `uv.lock` selalu di-commit
- **Dependabot**: enable di GitHub, auto-PR security update
- **Snyk** atau **Socket.dev** free tier untuk audit npm + pypi
- **`pnpm audit`** dan **`pip-audit`** di CI
- **Pin major version**: hindari `^` untuk dependency keamanan-kritis (auth, crypto)

## 12. Worker Isolation

Worker Python jalan FFmpeg, yt-dlp — eksekusi subprocess.

- **Jangan pernah** pakai `shell=True` di `subprocess.run`
- **Whitelist binary path**: `/usr/bin/ffmpeg`, `/usr/local/bin/yt-dlp` (hardcoded, jangan ambil dari env)
- **Sandbox**: jalankan worker di Docker dengan user non-root, read-only root filesystem, `--cap-drop=ALL`
- **Resource limit**: CPU, memory, disk quota di Docker
- **Network egress whitelist**: kalau ada firewall layer, allow hanya domain yang dibutuhkan (YT, Drive, Groq, R2)

```dockerfile
# worker/Dockerfile
FROM python:3.12-slim
RUN useradd -m -u 1000 worker
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
USER worker
WORKDIR /app
COPY --chown=worker pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv && uv sync --frozen
COPY --chown=worker src/ ./src/
CMD ["uv", "run", "celery", "-A", "src.tasks", "worker", "--loglevel=info", "--concurrency=2"]
```

## 13. Privacy & Data Retention

- Auto-delete clip & source video setelah **30 hari** (cron job)
- Auto-delete transcript text setelah 30 hari (sensitive content)
- User bisa request "delete all my data" — wipe Postgres + R2 dalam 24 jam
- Tidak mengirim transcript/video user ke service eksternal selain Groq (untuk scoring)
- **PII di prompt Groq**: WARNING — transcript bisa berisi nama, email, no telp. Tambah disclaimer di UI "transcript dikirim ke Groq untuk analisis viral" atau opsi opt-out (skip scoring, manual pick)

## 14. Incident Response (mini)

Kalau ada indikasi compromise:
1. **Rotate semua secret** (NEXTAUTH_SECRET, INTERNAL_API_SECRET, GROQ, R2, SMTP) dalam 1 jam
2. **Invalidate semua session** (clear Redis session key)
3. **Cek audit log** 30 hari terakhir untuk aktivitas mencurigakan
4. **Force re-auth + reset 2FA** semua user
5. Backup database snapshot pre-incident untuk forensik

## 15. Pre-Launch Security Checklist

- [ ] `.env.example` tersedia, `.env*` di `.gitignore`
- [ ] Tidak ada hardcoded secret (cek `git secrets scan` atau Gitleaks)
- [ ] HTTPS enforced di production
- [ ] Headers security set (HSTS, CSP, dll)
- [ ] Rate limit semua endpoint sensitif
- [ ] Zod validation di semua input
- [ ] File upload validasi magic bytes
- [ ] URL ingest cek SSRF + domain whitelist
- [ ] Prisma queries selalu filter userId (grep audit)
- [ ] 2FA tersedia
- [ ] Audit log aktif
- [ ] Backup database auto-schedule
- [ ] Dependabot + Snyk aktif
- [ ] Error message produksi tidak leak stack trace
- [ ] Sentry filter PII dari error report
- [ ] Worker Docker non-root + cap-drop ALL
- [ ] R2 bucket BUKAN public (semua akses via presign)
