import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC } from '../decorators/public.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const publicVal = this.reflector.get(PUBLIC, context.getHandler());
    if (publicVal) return true;
    const request = context.switchToHttp().getRequest();
    const roles = this.reflector.getAllAndMerge(Roles, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (!roles || roles.length === 0) return true;
    if (!roles.includes(request.user.role))
      throw new ForbiddenException('you are not allowed');
    return true;
  }
}
