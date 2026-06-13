// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./types/next-auth.d.ts" />
import NextAuth, { type NextAuthResult } from 'next-auth';
import Nodemailer from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';

import { authConfig } from './auth.config';
import { prisma } from './lib/prisma';
import { env } from './env';

const result = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 }, // 7 days
  providers: [
    Nodemailer({
      server: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
        secure: env.SMTP_PORT === 465,
      },
      from: env.SMTP_FROM,
      maxAge: 10 * 60, // magic link valid 10 min
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
