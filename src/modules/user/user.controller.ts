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
} from '../../common/index.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('complete-profile')
  @Auth()
  async completeProfile(@Body() body: CompleteProfileDto, @User() user: any) {
    return this.userService.completeProfile(user._id, body);
  }

  @Patch('location')
  @Auth()
  async updateLocation(@User() user: any, @Body() body: UpdateLocationDto) {
    return this.userService.updateLocation(user._id, body);
  }

  @Get('profile-image')
  @Auth()
  async getProfileImage(@User() user: any) {
    return this.userService.getProfileImage(user._id.toString());
  }

  @Get(':id')
  @Auth()
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Get('all-users')
  async getAllUsers() {
    return this.userService.getAllUsers();
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
