'use server';

import { z } from 'zod';
import { signIn } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid').max(254).toLowerCase().trim(),
});

export type LoginFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'sent'; email: string };

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Email tidak valid' };
  }

  const limit = await rateLimit(`login:${parsed.data.email}`, 5, 15 * 60);
  if (!limit.allowed) {
    const mins = Math.ceil(limit.resetSeconds / 60);
    return {
      status: 'error',
      message: `Terlalu banyak percobaan. Coba lagi dalam ${mins} menit.`,
    };
  }

  try {
    await signIn('nodemailer', {
      email: parsed.data.email,
      redirect: false,
      redirectTo: '/dashboard',
    });
    return { status: 'sent', email: parsed.data.email };
  } catch (error) {
    console.error('[login] signIn failed', error);
    return {
      status: 'error',
      message: 'Gagal mengirim magic link. Coba lagi.',
    };
  }
}
