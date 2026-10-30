import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { Auth, multerCloudConfig, User } from '../../common/index.js';
import { UserService } from './user.service.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('complete-profile')
  @Auth()
  async completeProfile(@Body() body: CompleteProfileDto, @User() user: any) {
    return this.userService.completeProfile(user._id, body);
  }

  @Get('all-users')
  async getAllUsers() {
    return this.userService.getAllUsers();
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
