import { LoginForm } from './login-form';

export const metadata = {
  title: 'Masuk · AI Video Tiktok Clip',
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Masuk</h1>
          <p className="text-sm text-neutral-400">
            Masukkan email Anda — kami akan kirim link untuk masuk.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-neutral-500">
          Tidak ada password. Tidak perlu daftar — akun dibuat otomatis saat pertama kali masuk.
        </p>
      </div>
    </main>
  );
}
