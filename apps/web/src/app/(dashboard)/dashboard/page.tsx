import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { apiJson } from '@/lib/api';

export const metadata = {
  title: 'Dashboard · AI Video Tiktok Clip',
};

interface JobListItem {
  id: string;
  sourceType: 'UPLOAD' | 'URL';
  sourceTitle: string | null;
  status: string;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  _count: { clips: number };
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();

  let jobs: JobListItem[] = [];
  try {
    jobs = await apiJson<JobListItem[]>('/api/jobs');
  } catch (err) {
    console.error('Failed to load jobs', err);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-neutral-400">
              Masuk sebagai{' '}
              <span className="font-mono text-neutral-200">{session?.user?.email}</span>
            </p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              Keluar
            </button>
          </form>
        </header>

        <section className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div>
            <h2 className="font-medium">Upload video baru</h2>
            <p className="text-sm text-neutral-400">
              Upload file atau paste URL video Anda. AI auto-clip ke 9:16 dengan subtitle.
            </p>
          </div>
          <Link
            href="/dashboard/upload"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
          >
            Upload
          </Link>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-300">Riwayat job</h2>
          {jobs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
              Belum ada job. Mulai dengan upload video.
            </p>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {job.sourceTitle ?? `${job.sourceType} · ${job.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(job.createdAt).toLocaleString('id-ID')} · {job._count.clips} clip
                      </p>
                    </div>
                    <StatusBadge status={job.status} progress={job.progress} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  const color =
    status === 'COMPLETED'
      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
      : status === 'FAILED'
        ? 'bg-red-950 text-red-300 border-red-800'
        : 'bg-neutral-800 text-neutral-300 border-neutral-700';

  const label = status === 'COMPLETED' || status === 'FAILED' ? status : `${status} ${progress}%`;
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${color}`}>{label}</span>
  );
}
