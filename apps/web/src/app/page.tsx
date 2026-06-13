import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="space-y-6 text-center">
        <span className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
          v0.0.0 — milestone 1
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">AI Video Tiktok Clip</h1>
        <p className="text-base text-neutral-400 sm:text-lg">
          Otomatis bikin clip viral 9:16 dari video panjang milik Anda — podcast, livestream,
          webinar — pakai Whisper + Groq LLM.
        </p>
        <div className="flex justify-center gap-3 pt-4">
          <Link
            href="/login"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
          >
            Masuk
          </Link>
        </div>
      </div>
    </main>
  );
}
