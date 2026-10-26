import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { UserRepository } from '../../models/index.js';
import { PUBLIC } from '../decorators/public.decorator.js';
import { AccountStatus } from '../enums/user.enums.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // 1. Check if route is public
      const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) return true;

      // 2. Get request
      const request = context.switchToHttp().getRequest();

      // 3. Get Authorization header
      const authorization = request.headers.authorization;

      if (!authorization)
        throw new UnauthorizedException('Access token is required');

      // 4. Extract Bearer token
      const [type, token] = authorization.split(' ');

      if (type !== 'Bearer' || !token)
        throw new UnauthorizedException('Invalid authorization header');

      // 5. Verify Access Token
      const payload = this.jwtService.verify<{
        _id: string;
        role: string;
        email: string;
      }>(token, {
        secret: process.env.ACCESS_JWT_SECRET,
      });

      // 6. Get user from database
      const user = await this.userRepository.getOne({
        _id: payload._id,
      });

      if (!user) throw new UnauthorizedException('User not found');

      // 7. Check account status
      if (user.status !== AccountStatus.ACTIVE)
        throw new UnauthorizedException('Account is not active');

      // 8. Attach user to request
      request.user = user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
