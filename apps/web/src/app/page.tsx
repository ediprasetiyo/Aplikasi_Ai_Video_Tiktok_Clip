export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="space-y-6 text-center">
        <span className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
          v0.0.0 — scaffold
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          AI Video Tiktok Clip
        </h1>
        <p className="text-base text-neutral-400 sm:text-lg">
          Otomatis bikin clip viral 9:16 dari video panjang milik Anda — podcast, livestream,
          webinar — pakai Whisper + Groq LLM.
        </p>
        <div className="flex flex-col items-center gap-2 pt-4 text-sm text-neutral-500">
          <code className="rounded bg-neutral-900 px-3 py-1.5 font-mono">
            docker compose up -d && pnpm dev
          </code>
          <p>
            API:{' '}
            <a className="underline hover:text-neutral-300" href="http://localhost:4000/health">
              localhost:4000/health
            </a>{' '}
            · Worker:{' '}
            <a className="underline hover:text-neutral-300" href="http://localhost:8000/health">
              localhost:8000/health
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
