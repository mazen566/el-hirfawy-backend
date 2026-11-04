import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';

import {
  Auth,
  User,
  UserRole,
} from '../../common/index.js';

import { AdminService } from './admin.service.js';

@Controller('admin')
@Auth(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Get all users
  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  // Approve provider
  @Patch('providers/:id/approve')
  approveProvider(
    @Param('id') id: string,
    @User() admin: any,
  ) {
    return this.adminService.approveProvider(
      id,
      admin._id.toString(),
    );
  }

  // Reject provider
  @Patch('providers/:id/reject')
  rejectProvider(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @User() admin: any,
  ) {
    return this.adminService.rejectProvider(
      id,
      reason,
      admin._id.toString(),
    );
  }

  // Suspend user
  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id') id: string,
    @User() admin: any,
  ) {
    return this.adminService.suspendUser(
      id,
      admin._id.toString(),
    );
  }

  // Activate user
  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }
}
