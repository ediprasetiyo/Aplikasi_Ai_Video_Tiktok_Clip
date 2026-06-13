import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from './auth.guard';
import type { AuthenticatedUser } from './auth.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    return req.user;
  },
);
