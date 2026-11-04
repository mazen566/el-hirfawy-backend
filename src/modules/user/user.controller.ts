import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  Auth,
  multerCloudConfig,
  MulterExceptionFilter,
  User,
  UserRole,
} from '../../common/index.js';

import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('complete-profile')
  @Auth()
  async completeProfile(
    @Body() body: CompleteProfileDto,
    @User() user: any,
  ) {
    return this.userService.completeProfile(user._id, body);
  }

  @Patch('location')
  @Auth()
  async updateLocation(
    @User() user: any,
    @Body() body: UpdateLocationDto,
  ) {
    return this.userService.updateLocation(user._id, body);
  }

  // Get all users - Admin only
  @Get('all-users')
  @Auth(UserRole.ADMIN)
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  // Approve provider - Admin only
  @Patch('providers/:id/approve')
  @Auth(UserRole.ADMIN)
  async approveProvider(
    @Param('id') id: string,
    @User() admin: any,
  ) {
    return this.userService.approveProvider(
      id,
      admin._id.toString(),
    );
  }

  // Reject provider - Admin only
  @Patch('providers/:id/reject')
  @Auth(UserRole.ADMIN)
  async rejectProvider(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @User() admin: any,
  ) {
    return this.userService.rejectProvider(
      id,
      reason,
      admin._id.toString(),
    );
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @Post('verify-identity')
  @Auth()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'selfieImage', maxCount: 1 },
        { name: 'idCardImage', maxCount: 1 },
      ],
      multerCloudConfig,
    ),
  )
  async verifyIdentity(
    @UploadedFiles()
    files: {
      idCardImage?: Express.Multer.File[];
      selfieImage?: Express.Multer.File[];
    },
    @User() user: any,
  ) {
    return this.userService.uploadIdentityImages(user._id, files);
  }

  @Patch('profile-image')
  @Auth()
  @UseInterceptors(FileInterceptor('profileImage', multerCloudConfig))
  async updateProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @User() user: any,
  ) {
    return this.userService.updateProfileImage(user._id, file);
  }
}
