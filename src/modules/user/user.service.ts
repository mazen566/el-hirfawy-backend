import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService, UserRole } from '../../common/index.js';
import { ProviderRepository, UserRepository } from '../../models/index.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { Types } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly userRepository: UserRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async completeProfile(userId: string, body: CompleteProfileDto) {
    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.address = body.address;

    if (user.role === UserRole.PROVIDER) {
      if (!body.title || !body.bio || body.experience === undefined) {
        throw new BadRequestException(
          'Title, bio and experience are required for providers',
        );
      }

      const provider = await this.providerRepository.getOne({
        _id: userId,
      });

      if (!provider) {
        throw new NotFoundException('Provider profile not found');
      }

      provider.address = body.address;
      provider.title = body.title;
      provider.bio = body.bio;
      provider.experience = body.experience;

      await provider.save();
    } else {
      await user.save();
    }

    return {
      message: 'Profile completed successfully',
    };
  }

  async getAllUsers() {
    const users = await this.userRepository.getAllUsers();

    return {
      message: 'Users retrieved successfully',
      count: users.length,
      data: users,
    };
  }

  async getUserById(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userRepository.getOne(
      { _id: userId },
      {
        password: 0,
        otp: 0,
        otpExpiry: 0,
        refreshToken: 0,
      },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async uploadIdentityImages(
    userId: string,
    files: {
      idCardImage?: Express.Multer.File[];
      selfieImage?: Express.Multer.File[];
    },
  ) {
    if (!files.idCardImage?.[0] || !files.selfieImage?.[0]) {
      throw new BadRequestException(
        'Both ID card image and selfie image are required',
      );
    }

    const provider = await this.providerRepository.getOne({
      _id: userId,
    });

    if (!provider) throw new NotFoundException('Provider profile not found');

    const [idCard, selfie] = await Promise.all([
      this.cloudinaryService.uploadImage(
        files.idCardImage[0],
        'el-hirfawy/identity/id-cards',
      ),
      this.cloudinaryService.uploadImage(
        files.selfieImage[0],
        'el-hirfawy/identity/selfies',
      ),
    ]);

    provider.idCardImageKey = idCard.public_id;
    provider.selfieImageKey = selfie.public_id;

    await provider.save();

    return {
      message: 'Identity images uploaded successfully',
      data: {
        idCardImage: idCard,
        selfieImage: selfie,
      },
    };
  }

  async updateProfileImage(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Profile image is required');

    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) throw new NotFoundException('User not found');

    const uploadedImage = await this.cloudinaryService.uploadImage(
      file,
      'el-hirfawy/profile-images',
    );

    // Delete old profile image if it exists
    if (user.profileImageKey)
      await this.cloudinaryService.deleteImage(user.profileImageKey);

    user.profileImageKey = uploadedImage.public_id;
    await user.save();

    return {
      message: 'Profile image updated successfully',
      data: {
        profileImage: uploadedImage.secure_url,
      },
    };
  }
}
