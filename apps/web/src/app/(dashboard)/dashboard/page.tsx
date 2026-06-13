import { auth, signOut } from '@/auth';

export const metadata = {
  title: 'Dashboard · AI Video Tiktok Clip',
};

export default async function DashboardPage() {
  const session = await auth();

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

        <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="font-medium">Belum ada job</h2>
          <p className="text-sm text-neutral-400">
            Fitur upload & generate clip akan tersedia di Milestone 2.
          </p>
        </section>

        <section className="space-y-2 text-xs text-neutral-500">
          <p>Session ID: <span className="font-mono">{session?.user?.id}</span></p>
          <p>
            API:{' '}
            <a className="underline" href="http://localhost:4000/health" target="_blank" rel="noreferrer">
              localhost:4000/health
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
