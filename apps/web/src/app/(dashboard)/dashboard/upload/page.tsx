import { UploadFlow } from './upload-flow';

export const metadata = {
  title: 'Upload · AI Video Tiktok Clip',
};

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Upload video panjang</h1>
          <p className="text-sm text-neutral-400">
            Upload file (max 2 GB) atau paste URL video Anda di YouTube / Drive. AI akan pilih 5-10
            momen viral dan crop ke 9:16.
          </p>
        </header>
        <UploadFlow />
      </div>
    </main>
  );
}
