import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserMongoModule } from '../../shared/index.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [UserMongoModule],
  controllers: [AdminController],
  providers: [AdminService, JwtService, AuthGuard, RolesGuard],
})
export class AdminModule {}
