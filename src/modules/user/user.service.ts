import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Types } from 'mongoose';

import {
  AccountStatus,
  CloudinaryService,
  UserRole,
  VerificationStatus,
  validateImage,
} from '../../common/index.js';

import {
  ProviderRepository,
  UserRepository,
} from '../../models/index.js';

import { AiVerificationService } from '../ai/ai.service.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';

@Injectable()
export class UserService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly userRepository: UserRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly aiVerificationService: AiVerificationService,
  ) {}

  async completeProfile(userId: string, body: CompleteProfileDto) {
    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !body.address?.governorate ||
      !body.address?.district ||
      !body.address?.street
    ) {
      throw new BadRequestException(
        'Governorate, district and street are required',
      );
    }

    if (user.role === UserRole.PROVIDER) {
      if (
        !body.service ||
        !body.experience ||
        !body.workingHours?.from ||
        !body.workingHours?.to
      ) {
        throw new BadRequestException(
          'Service, experience and working hours are required for providers',
        );
      }

      const provider = await this.providerRepository.getOne({
        _id: userId,
      });

      if (!provider) {
        throw new NotFoundException('Provider profile not found');
      }

      provider.address = body.address;
      provider.service = body.service;
      provider.experience = body.experience;
      provider.workingHours = body.workingHours;

      await provider.save();
    } else {
      user.address = body.address;
      await user.save();
    }

    return {
      message: 'Profile completed successfully',
    };
  }

  async updateLocation(userId: string, body: UpdateLocationDto) {
    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.location = {
      type: 'Point',
      coordinates: [body.longitude, body.latitude],
    };

    await user.save();

    return {
      message: 'Location updated successfully',
      location: user.location,
    };
  }

  // Get all users
  async getAllUsers() {
    const users = await this.userRepository.getAllUsers();

    return {
      message: 'Users retrieved successfully',
      count: users.length,
      data: users,
    };
  }

  // Approve provider
  async approveProvider(
    providerId: string,
    adminId: string,
  ) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new BadRequestException('Invalid provider ID');
    }

    const provider = await this.providerRepository.getOne({
      _id: providerId,
      role: UserRole.PROVIDER,
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (
      provider.verificationStatus !== VerificationStatus.PENDING
    ) {
      throw new ConflictException(
        'Only pending providers can be approved',
      );
    }

    // Update verification information
    provider.verificationStatus = VerificationStatus.APPROVED;

    // Activate provider account
    provider.status = AccountStatus.ACTIVE;

    // Save admin and approval date
    provider.verifiedAt = new Date();
    provider.verifiedBy = adminId;

    // Clear previous rejection reason
    provider.rejectionReason = undefined;

    await provider.save();

    return {
      message: 'Provider approved successfully',
      success: true,
      data: {
        id: provider._id,
        verificationStatus: provider.verificationStatus,
        status: provider.status,
        verifiedAt: provider.verifiedAt,
        verifiedBy: provider.verifiedBy,
      },
    };
  }

  // Reject provider
  async rejectProvider(
    providerId: string,
    reason: string,
    adminId: string,
  ) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new BadRequestException('Invalid provider ID');
    }

    if (!reason || !reason.trim()) {
      throw new BadRequestException(
        'Rejection reason is required',
      );
    }

    if (reason.trim().length > 1000) {
      throw new BadRequestException(
        'Rejection reason must not exceed 1000 characters',
      );
    }

    const provider = await this.providerRepository.getOne({
      _id: providerId,
      role: UserRole.PROVIDER,
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (
      provider.verificationStatus !== VerificationStatus.PENDING
    ) {
      throw new ConflictException(
        'Only pending providers can be rejected',
      );
    }

    provider.verificationStatus = VerificationStatus.REJECTED;

    // Keep account inactive after rejection
    provider.status = AccountStatus.PENDING;

    provider.verifiedAt = new Date();
    provider.verifiedBy = adminId;
    provider.rejectionReason = reason.trim();

    await provider.save();

    return {
      message: 'Provider rejected successfully',
      success: true,
      data: {
        id: provider._id,
        verificationStatus: provider.verificationStatus,
        status: provider.status,
        rejectionReason: provider.rejectionReason,
        verifiedAt: provider.verifiedAt,
        verifiedBy: provider.verifiedBy,
      },
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

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    await Promise.all([
      validateImage(files.idCardImage[0]),
      validateImage(files.selfieImage[0]),
    ]);

    const aiResponse = await this.aiVerificationService.verifyIdentity(
      files.idCardImage[0],
      files.selfieImage[0],
    );

    if (
      !aiResponse.success ||
      typeof aiResponse.similarity_score !== 'number' ||
      !Number.isFinite(aiResponse.similarity_score) ||
      aiResponse.similarity_score < 0 ||
      aiResponse.similarity_score > 1
    ) {
      throw new BadRequestException(
        'AI identity verification failed',
      );
    }

    const aiResult = Number(
      (aiResponse.similarity_score * 100).toFixed(2),
    );

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
    provider.aiResult = aiResult;

    await provider.save();

    return {
      message: 'Identity images uploaded and analyzed successfully',
      data: {
        idCardImage: idCard,
        selfieImage: selfie,
        aiResult,
        aiDecision: aiResponse.decision,
        aiMessage: aiResponse.message,
      },
    };
  }

  async updateProfileImage(
    userId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Profile image is required',
      );
    }

    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const uploadedImage = await this.cloudinaryService.uploadImage(
      file,
      'el-hirfawy/profile-images',
    );

    // Delete old profile image if it exists
    if (user.profileImageKey) {
      await this.cloudinaryService.deleteImage(
        user.profileImageKey,
      );
    }

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
