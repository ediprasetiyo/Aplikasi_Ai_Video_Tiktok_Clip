'use server';

import { redirect } from 'next/navigation';
import {
  ALLOWED_UPLOAD_MIMES,
  MAX_UPLOAD_SIZE_BYTES,
  createJobInputSchema,
  jobConfigSchema,
  presignUploadInputSchema,
  sourceUrlSchema,
} from '@tiktok-clip/shared';
import { z } from 'zod';
import { auth } from '@/auth';
import { apiJson } from '@/lib/api';

export interface PresignResult {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

export async function presignUpload(input: {
  filename: string;
  size: number;
  contentType: string;
}): Promise<PresignResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const parsed = presignUploadInputSchema.parse(input);
  return apiJson<PresignResult>('/api/upload/presign', {
    method: 'POST',
    body: JSON.stringify(parsed),
  });
}

export async function finalizeUpload(key: string, contentType: string): Promise<void> {
  if (!(ALLOWED_UPLOAD_MIMES as readonly string[]).includes(contentType)) {
    throw new Error('Unsupported content type');
  }
  await apiJson('/api/upload/finalize', {
    method: 'POST',
    body: JSON.stringify({ key, contentType }),
  });
}

const createFromUploadSchema = jobConfigSchema.extend({
  sourceKey: z.string().min(1).max(512),
});

const createFromUrlSchema = jobConfigSchema.extend({
  sourceUrl: sourceUrlSchema,
});

export async function createJobFromUpload(
  input: z.infer<typeof createFromUploadSchema>,
): Promise<void> {
  const parsed = createFromUploadSchema.parse(input);
  const validated = createJobInputSchema.parse({
    sourceType: 'UPLOAD',
    sourceKey: parsed.sourceKey,
    config: {
      clipCount: parsed.clipCount,
      targetDuration: parsed.targetDuration,
      subtitleStyle: parsed.subtitleStyle,
      language: parsed.language,
    },
  });
  const job = await apiJson<{ id: string }>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
  redirect(`/dashboard/jobs/${job.id}`);
}

export async function createJobFromUrl(
  input: z.infer<typeof createFromUrlSchema>,
): Promise<void> {
  const parsed = createFromUrlSchema.parse(input);
  const validated = createJobInputSchema.parse({
    sourceType: 'URL',
    sourceUrl: parsed.sourceUrl,
    config: {
      clipCount: parsed.clipCount,
      targetDuration: parsed.targetDuration,
      subtitleStyle: parsed.subtitleStyle,
      language: parsed.language,
    },
  });
  const job = await apiJson<{ id: string }>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
  redirect(`/dashboard/jobs/${job.id}`);
}

export const UPLOAD_LIMITS = {
  maxBytes: MAX_UPLOAD_SIZE_BYTES,
  allowedMimes: ALLOWED_UPLOAD_MIMES,
};
