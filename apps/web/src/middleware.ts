import NextAuth, { type NextAuthResult } from 'next-auth';
import { authConfig } from './auth.config';

const result = NextAuth(authConfig);
const auth: NextAuthResult['auth'] = result.auth;
export default auth;

export const config = {
  // Skip the auth API itself + static assets
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
