import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async me(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    // Light demo of audit logging for now.
    await this.audit.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: '/api/me',
      request: req,
    });
    return { id: user.id, email: user.email };
  }
}
