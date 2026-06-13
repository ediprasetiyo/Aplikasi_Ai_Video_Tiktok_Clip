import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // NextAuth.js v5 uses AUTH_SECRET; we mirror NEXTAUTH_SECRET to it at runtime.
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().email().default('noreply@tiktok-clip.local'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
