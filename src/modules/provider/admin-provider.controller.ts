import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Auth, User, UserRole } from '../../common/index.js';
import { AdminProviderService } from './admin-provider.service.js';
import { RejectProviderDto } from './dto/reject-provider.dto.js';

@Controller('admin/providers')
@Auth(UserRole.ADMIN)
export class AdminProviderController {
  constructor(private readonly adminProviderService: AdminProviderService) {}

  @Get()
  getProviders(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminProviderService.getProviders(page, limit);
  }

  @Patch(':id/approve')
  approveProvider(@Param('id') id: string, @User() admin: any) {
    return this.adminProviderService.approveProvider(id, admin._id.toString());
  }

  @Patch(':id/reject')
  rejectProvider(
    @Param('id') id: string,
    @Body() body: RejectProviderDto,
    @User() admin: any,
  ) {
    return this.adminProviderService.rejectProvider(
      id,
      body.reason,
      admin._id.toString(),
    );
  }
}
