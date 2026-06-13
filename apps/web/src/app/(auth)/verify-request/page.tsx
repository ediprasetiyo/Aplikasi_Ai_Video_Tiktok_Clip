export const metadata = {
  title: 'Cek email · AI Video Tiktok Clip',
};

export default function VerifyRequestPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold">Cek email Anda</h1>
        <p className="text-sm text-neutral-400">
          Link masuk sudah dikirim. Buka email dan klik link untuk melanjutkan. Berlaku 10 menit.
        </p>
        <p className="text-xs text-neutral-500">
          Di dev:{' '}
          <a className="underline" href="http://localhost:8025" target="_blank" rel="noreferrer">
            Mailpit UI
          </a>
        </p>
      </div>
    </main>
  );
}
