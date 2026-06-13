import { headers } from 'next/headers';
import { env } from '@/env';

interface FetchOptions extends RequestInit {
  forwardCookie?: boolean;
}

/**
 * Server-side fetch to the NestJS API.
 * Auto-forwards the session cookie so AuthGuard can decode it.
 */
export async function apiFetch(path: string, opts: FetchOptions = {}): Promise<Response> {
  const { forwardCookie = true, headers: extra, ...rest } = opts;
  const url = `${env.API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const merged = new Headers(extra);
  if (forwardCookie) {
    const h = await headers();
    const cookie = h.get('cookie');
    if (cookie) merged.set('cookie', cookie);
  }
  if (!merged.has('content-type') && rest.body && typeof rest.body === 'string') {
    merged.set('content-type', 'application/json');
  }

  return fetch(url, { ...rest, headers: merged, cache: 'no-store' });
}

export async function apiJson<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}
