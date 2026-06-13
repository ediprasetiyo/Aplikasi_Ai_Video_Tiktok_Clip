'use client';

import { useActionState } from 'react';
import { loginAction, type LoginFormState } from './actions';

const initialState: LoginFormState = { status: 'idle' };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  if (state.status === 'sent') {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-700 bg-emerald-950 p-4 text-sm text-emerald-200">
        <p className="font-medium">Cek email Anda.</p>
        <p>
          Kami sudah mengirim link masuk ke{' '}
          <span className="font-mono text-emerald-100">{state.email}</span>. Link berlaku 10 menit.
        </p>
        <p className="text-xs text-emerald-300/80">
          Di dev: buka{' '}
          <a className="underline" href="http://localhost:8025" target="_blank" rel="noreferrer">
            Mailpit UI
          </a>{' '}
          untuk lihat email.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
          placeholder="anda@email.com"
        />
      </div>

      {state.status === 'error' ? (
        <p className="text-sm text-red-400" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Mengirim…' : 'Kirim link masuk'}
      </button>
    </form>
  );
}
