import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config (no Prisma, no Node APIs).
 * Used by middleware.ts for route protection.
 * Full config with adapter + providers lives in `auth.ts`.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-request',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage =
        nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/verify-request');
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      if (isOnDashboard) return isLoggedIn;
      if (isLoggedIn && isOnAuthPage) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  providers: [],
};
