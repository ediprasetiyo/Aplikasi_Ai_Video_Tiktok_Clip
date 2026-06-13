import { z } from 'zod';

export const subtitleStyleSchema = z.enum(['bold-white', 'tiktok-yellow', 'minimal-black']);
export const languageSchema = z.enum(['auto', 'id', 'en']);
export const sourceTypeSchema = z.enum(['UPLOAD', 'URL']);

export const jobConfigSchema = z.object({
  clipCount: z.number().int().min(1).max(10),
  targetDuration: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(90)]),
  subtitleStyle: subtitleStyleSchema,
  language: languageSchema,
});

export const ALLOWED_UPLOAD_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const MAX_SOURCE_DURATION_SECONDS = 3 * 60 * 60; // 3 hours

export const presignUploadInputSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
  contentType: z.enum(ALLOWED_UPLOAD_MIMES),
});

// Allowed hosts for URL ingest. Worker enforces SSRF guard too.
export const ALLOWED_URL_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'drive.google.com',
  'www.dropbox.com',
  'dropbox.com',
] as const;

export const sourceUrlSchema = z
  .string()
  .url()
  .refine(
    (raw) => {
      try {
        const u = new URL(raw);
        if (u.protocol !== 'https:') return false;
        return (ALLOWED_URL_HOSTS as readonly string[]).includes(u.hostname);
      } catch {
        return false;
      }
    },
    { message: 'URL host not allowed. Use YouTube, Google Drive, or Dropbox link.' },
  );

export const createJobInputSchema = z
  .object({
    sourceType: sourceTypeSchema,
    sourceUrl: sourceUrlSchema.optional(),
    sourceKey: z.string().min(1).max(512).optional(),
    config: jobConfigSchema,
  })
  .refine((v) => (v.sourceType === 'URL' ? !!v.sourceUrl : !!v.sourceKey), {
    message: 'sourceUrl required for URL, sourceKey required for UPLOAD',
  });

export const workerProgressSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum([
    'QUEUED',
    'DOWNLOADING',
    'TRANSCRIBING',
    'SCORING',
    'RENDERING',
    'COMPLETED',
    'FAILED',
  ]),
  progress: z.number().int().min(0).max(100),
  errorMessage: z.string().max(2000).optional(),
});

export type CreateJobInput = z.infer<typeof createJobInputSchema>;
export type PresignUploadInput = z.infer<typeof presignUploadInputSchema>;
export type WorkerProgressInput = z.infer<typeof workerProgressSchema>;
