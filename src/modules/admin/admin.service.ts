import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Types } from 'mongoose';

import {
  AccountStatus,
  UserRole,
  VerificationStatus,
} from '../../common/index.js';

import {
  ProviderRepository,
  UserRepository,
} from '../../models/index.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly userRepository: UserRepository,
  ) {}

  // Get all users
  async getAllUsers() {
    const users = await this.userRepository.getAllUsers();

    return {
      success: true,
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

    provider.verificationStatus = VerificationStatus.APPROVED;
    provider.status = AccountStatus.ACTIVE;
    provider.verifiedAt = new Date();
    provider.verifiedBy = adminId;
    provider.rejectionReason = undefined;

    await provider.save();

    return {
      success: true,
      message: 'Provider approved successfully',
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

    if (!reason?.trim()) {
      throw new BadRequestException(
        'Rejection reason is required',
      );
    }

    if (reason.trim().length > 1000) {
      throw new BadRequestException(
        'Rejection reason is too long',
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
    provider.status = AccountStatus.PENDING;
    provider.verifiedAt = new Date();
    provider.verifiedBy = adminId;
    provider.rejectionReason = reason.trim();

    await provider.save();

    return {
      success: true,
      message: 'Provider rejected successfully',
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

  // Suspend user
  async suspendUser(userId: string, adminId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    if (userId === adminId) {
      throw new BadRequestException(
        'You cannot suspend your own admin account',
      );
    }

    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new ConflictException('User is already suspended');
    }

    user.status = AccountStatus.SUSPENDED;

    await user.save();

    return {
      success: true,
      message: 'User suspended successfully',
      data: {
        id: user._id,
        status: user.status,
      },
    };
  }

  // Activate user
  async activateUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === AccountStatus.ACTIVE) {
      throw new ConflictException('User is already active');
    }

    // A provider must be approved before activation
    if (
      user.role === UserRole.PROVIDER &&
      (user as any).verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Provider must be approved before activation',
      );
    }

    user.status = AccountStatus.ACTIVE;

    await user.save();

    return {
      success: true,
      message: 'User activated successfully',
      data: {
        id: user._id,
        status: user.status,
      },
    };
  }
}
