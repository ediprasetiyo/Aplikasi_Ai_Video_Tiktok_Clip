import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthenticatedUser } from './auth.service';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = await this.auth.resolveUserFromRequest(req);
    if (!user) throw new UnauthorizedException('Not authenticated');
    (req as RequestWithUser).user = user;
    return true;
  }
}
