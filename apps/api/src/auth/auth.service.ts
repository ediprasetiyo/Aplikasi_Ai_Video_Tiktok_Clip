import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode } from '@auth/core/jwt';
import { parse } from 'cookie';
import type { Request } from 'express';

const COOKIE_NAMES = [
  'authjs.session-token', // dev (http)
  '__Secure-authjs.session-token', // production (https)
];

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly secret: string;
  private readonly salt: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('AUTH_SECRET');
    // NextAuth derives keys from secret + salt (which defaults to the cookie name).
    // We accept both cookies and try both salts.
    this.salt = 'authjs.session-token';
  }

  async resolveUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
    const sessionToken = this.extractSessionToken(req);
    if (!sessionToken) return null;

    try {
      const payload = await decode({
        token: sessionToken,
        secret: this.secret,
        salt: this.salt,
      });
      if (!payload?.sub) return null;
      return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
    } catch (err) {
      // Fall back to production cookie salt
      try {
        const payload = await decode({
          token: sessionToken,
          secret: this.secret,
          salt: '__Secure-authjs.session-token',
        });
        if (!payload?.sub) return null;
        return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
      } catch (innerErr) {
        this.logger.debug(`Session token decode failed: ${(innerErr as Error).message}`);
        return null;
      }
    }
  }

  private extractSessionToken(req: Request): string | null {
    const header = req.headers.cookie;
    if (!header) return null;
    const cookies = parse(header);
    for (const name of COOKIE_NAMES) {
      const token = cookies[name];
      if (token) return token;
    }
    return null;
  }
}
