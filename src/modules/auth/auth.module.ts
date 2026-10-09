import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserMongoModule } from '../../shared/index.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthFactoryService } from './factory/index.js';

@Module({
  imports: [UserMongoModule],
  controllers: [AuthController],
  providers: [AuthService, AuthFactoryService, JwtService],
})
export class AuthModule {}
