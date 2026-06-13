import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'ENABLE_2FA'
  | 'DISABLE_2FA'
  | 'UPLOAD_VIDEO'
  | 'CREATE_JOB'
  | 'DELETE_JOB'
  | 'DOWNLOAD_CLIP'
  | 'DELETE_CLIP';

export interface AuditContext {
  userId?: string | null;
  action: AuditAction;
  resource?: string | null;
  metadata?: Record<string, unknown> | null;
  request?: Pick<Request, 'ip' | 'headers'> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(ctx: AuditContext): Promise<void> {
    try {
      const ipAddress = ctx.request?.ip ?? null;
      const userAgentHeader = ctx.request?.headers['user-agent'];
      const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader.slice(0, 500) : null;

      await this.prisma.auditLog.create({
        data: {
          userId: ctx.userId ?? null,
          action: ctx.action,
          resource: ctx.resource ?? null,
          metadata: (ctx.metadata as object | null) ?? undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (err) {
      // Audit logging must never break a request.
      this.logger.error(`Failed to write audit log for ${ctx.action}`, err);
    }
  }
}
