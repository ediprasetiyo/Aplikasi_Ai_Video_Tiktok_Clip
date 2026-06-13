'use client';

import { useCallback, useState, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  createJobFromUpload,
  createJobFromUrl,
  finalizeUpload,
  presignUpload,
  UPLOAD_LIMITS,
} from './actions';
import type { JobConfig } from '@tiktok-clip/shared';

type Phase =
  | { kind: 'idle' }
  | { kind: 'uploading'; percent: number; filename: string }
  | { kind: 'validating'; filename: string }
  | { kind: 'ready'; key: string; filename: string }
  | { kind: 'error'; message: string };

const DEFAULT_CONFIG: JobConfig = {
  clipCount: 5,
  targetDuration: 60,
  subtitleStyle: 'bold-white',
  language: 'auto',
};

export function UploadFlow() {
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const [config, setConfig] = useState<JobConfig>(DEFAULT_CONFIG);

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab('file')}
          className={`rounded-md px-4 py-1.5 ${
            tab === 'file' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`rounded-md px-4 py-1.5 ${
            tab === 'url' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Paste URL
        </button>
      </div>

      <ConfigForm config={config} onChange={setConfig} />

      {tab === 'file' ? <FileUploadPanel config={config} /> : <UrlPanel config={config} />}
    </div>
  );
}

function ConfigForm({
  config,
  onChange,
}: {
  config: JobConfig;
  onChange: (next: JobConfig) => void;
}) {
  return (
    <fieldset className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium text-neutral-300">Konfigurasi clip</legend>

      <label className="space-y-1 text-sm">
        <span className="text-neutral-400">Jumlah clip: {config.clipCount}</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={config.clipCount}
          onChange={(e) => onChange({ ...config, clipCount: Number(e.target.value) })}
          className="w-full accent-white"
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-neutral-400">Durasi target</span>
        <select
          value={config.targetDuration}
          onChange={(e) =>
            onChange({
              ...config,
              targetDuration: Number(e.target.value) as JobConfig['targetDuration'],
            })
          }
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
        >
          <option value={15}>15 detik</option>
          <option value={30}>30 detik</option>
          <option value={60}>60 detik</option>
          <option value={90}>90 detik</option>
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-neutral-400">Gaya subtitle</span>
        <select
          value={config.subtitleStyle}
          onChange={(e) =>
            onChange({ ...config, subtitleStyle: e.target.value as JobConfig['subtitleStyle'] })
          }
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
        >
          <option value="bold-white">Bold White</option>
          <option value="tiktok-yellow">TikTok Yellow</option>
          <option value="minimal-black">Minimal Black</option>
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-neutral-400">Bahasa</span>
        <select
          value={config.language}
          onChange={(e) =>
            onChange({ ...config, language: e.target.value as JobConfig['language'] })
          }
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
        >
          <option value="auto">Auto-detect</option>
          <option value="id">Indonesia</option>
          <option value="en">English</option>
        </select>
      </label>
    </fieldset>
  );
}

function FileUploadPanel({ config }: { config: JobConfig }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [isPending, startTransition] = useTransition();

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!(UPLOAD_LIMITS.allowedMimes as readonly string[]).includes(file.type)) {
      setPhase({
        kind: 'error',
        message: 'Format tidak didukung. Gunakan MP4, MOV, MKV, atau WebM.',
      });
      return;
    }
    if (file.size > UPLOAD_LIMITS.maxBytes) {
      setPhase({
        kind: 'error',
        message: `File terlalu besar (max ${formatBytes(UPLOAD_LIMITS.maxBytes)}).`,
      });
      return;
    }

    try {
      setPhase({ kind: 'uploading', percent: 0, filename: file.name });
      const presigned = await presignUpload({
        filename: file.name,
        size: file.size,
        contentType: file.type,
      });

      await putToR2(presigned.uploadUrl, file, (percent) =>
        setPhase({ kind: 'uploading', percent, filename: file.name }),
      );

      setPhase({ kind: 'validating', filename: file.name });
      await finalizeUpload(presigned.key, file.type);

      setPhase({ kind: 'ready', key: presigned.key, filename: file.name });
    } catch (err) {
      setPhase({ kind: 'error', message: (err as Error).message });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-matroska': ['.mkv'],
      'video/webm': ['.webm'],
    },
    disabled: phase.kind === 'uploading' || phase.kind === 'validating' || isPending,
  });

  const onSubmit = () => {
    if (phase.kind !== 'ready') return;
    startTransition(async () => {
      try {
        await createJobFromUpload({ ...config, sourceKey: phase.key });
      } catch (err) {
        setPhase({ kind: 'error', message: (err as Error).message });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
          isDragActive
            ? 'border-white bg-neutral-900'
            : 'border-neutral-700 hover:border-neutral-500'
        }`}
      >
        <input {...getInputProps()} />
        {phase.kind === 'idle' && (
          <p className="text-sm text-neutral-400">
            Drag &amp; drop video di sini, atau klik untuk pilih file. <br />
            <span className="text-xs">MP4, MOV, MKV, WebM · max 2 GB</span>
          </p>
        )}
        {phase.kind === 'uploading' && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-200">Mengunggah {phase.filename}…</p>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${phase.percent}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500">{phase.percent}%</p>
          </div>
        )}
        {phase.kind === 'validating' && (
          <p className="text-sm text-neutral-200">Memvalidasi {phase.filename}…</p>
        )}
        {phase.kind === 'ready' && (
          <p className="text-sm text-emerald-300">
            ✓ {phase.filename} berhasil diunggah. Klik tombol di bawah untuk mulai proses.
          </p>
        )}
        {phase.kind === 'error' && <p className="text-sm text-red-400">{phase.message}</p>}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={phase.kind !== 'ready' || isPending}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Menjadwalkan…' : 'Mulai proses AI'}
      </button>
    </div>
  );
}

function UrlPanel({ config }: { config: JobConfig }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createJobFromUrl({ ...config, sourceUrl: url });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <label htmlFor="source-url" className="block text-sm font-medium text-neutral-300">
        URL video (YouTube / Drive / Dropbox)
      </label>
      <input
        id="source-url"
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtube.com/watch?v=…"
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
      />
      <p className="text-xs text-neutral-500">
        Pastikan ini video <strong>milik Anda</strong> atau yang Anda punya izin. Sistem hanya
        menerima domain YouTube, Google Drive, dan Dropbox.
      </p>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={!url || isPending}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Menjadwalkan…' : 'Mulai proses AI'}
      </button>
    </form>
  );
}

function putToR2(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(file);
  });
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}
