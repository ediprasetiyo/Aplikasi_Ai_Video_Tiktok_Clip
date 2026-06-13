// Shared types between web (Next.js) and api (NestJS).
// Keep this dependency-free — schemas live in schemas.ts.

export type JobStatus =
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'TRANSCRIBING'
  | 'SCORING'
  | 'RENDERING'
  | 'COMPLETED'
  | 'FAILED';

export type SourceType = 'UPLOAD' | 'URL';

export type SubtitleStyle = 'bold-white' | 'tiktok-yellow' | 'minimal-black';

export type Language = 'auto' | 'id' | 'en';

export interface JobConfig {
  clipCount: number;
  targetDuration: 15 | 30 | 60 | 90;
  subtitleStyle: SubtitleStyle;
  language: Language;
}

export interface Job {
  id: string;
  userId: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceKey: string | null;
  sourceTitle: string | null;
  sourceDuration: number | null;
  config: JobConfig;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface Clip {
  id: string;
  jobId: string;
  startTime: number;
  endTime: number;
  duration: number;
  viralScore: number;
  reason: string;
  hookLine: string | null;
  videoKey: string;
  thumbnailKey: string | null;
  subtitleKey: string | null;
  createdAt: Date;
  expiresAt: Date;
}

// Worker -> API progress update payload.
export interface WorkerProgressUpdate {
  jobId: string;
  status: JobStatus;
  progress: number;
  errorMessage?: string;
}
