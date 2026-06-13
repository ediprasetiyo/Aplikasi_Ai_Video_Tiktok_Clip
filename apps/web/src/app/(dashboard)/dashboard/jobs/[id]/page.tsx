import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiJson } from '@/lib/api';

interface JobDetail {
  id: string;
  sourceType: 'UPLOAD' | 'URL';
  status: string;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  clips: Array<{
    id: string;
    startTime: number;
    endTime: number;
    duration: number;
    viralScore: number;
    reason: string;
    hookLine: string | null;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let job: JobDetail;
  try {
    job = await apiJson<JobDetail>(`/api/jobs/${id}`);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="space-y-6">
        <header className="space-y-1">
          <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-neutral-300">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold">Job {job.id.slice(0, 8)}</h1>
          <p className="text-sm text-neutral-400">
            Status: <span className="font-mono text-neutral-200">{job.status}</span> ·{' '}
            {job.progress}%
          </p>
        </header>

        <div className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full bg-white transition-all" style={{ width: `${job.progress}%` }} />
          </div>
          {job.errorMessage ? (
            <p className="text-sm text-red-400">{job.errorMessage}</p>
          ) : (
            <p className="text-xs text-neutral-500">
              Worker AI sedang bekerja. Halaman ini akan menampilkan clip setelah selesai
              (Milestone 5).
            </p>
          )}
        </div>

        {job.clips.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-neutral-300">
              {job.clips.length} clip dihasilkan
            </h2>
            <ul className="space-y-2">
              {job.clips.map((clip) => (
                <li
                  key={clip.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      {fmt(clip.startTime)} – {fmt(clip.endTime)} ({clip.duration.toFixed(1)}s)
                    </span>
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
                      Skor {clip.viralScore}
                    </span>
                  </div>
                  {clip.hookLine ? (
                    <p className="mt-2 text-sm text-neutral-200">&ldquo;{clip.hookLine}&rdquo;</p>
                  ) : null}
                  <p className="mt-1 text-xs text-neutral-500">{clip.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
