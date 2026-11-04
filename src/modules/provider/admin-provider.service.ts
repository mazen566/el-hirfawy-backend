import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AccountStatus, UserRole, VerificationStatus } from '../../common/index.js';
import { ProviderRepository } from '../../models/index.js';

@Injectable()
export class AdminProviderService {
  constructor(private readonly providerRepository: ProviderRepository) {}

  async getProviders(pageValue?: string, limitValue?: string) {
    const page = Math.max(1, Number.parseInt(pageValue ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(limitValue ?? '10', 10) || 10));
    const data = await this.providerRepository.getAll(
      { role: UserRole.PROVIDER },
      { password: 0, otp: 0, otpExpiry: 0, refreshToken: 0 },
      { sort: { createdAt: -1 } },
      { page, limit },
    );
    return {
      message: 'Providers retrieved successfully',
      success: true,
      data,
      pagination: { page, limit, returned: data.length },
    };
  }

  async approveProvider(providerId: string, adminId: string) {
    const provider = await this.findProvider(providerId);
    if (provider.verificationStatus === VerificationStatus.APPROVED) {
      throw new ConflictException('Provider is already approved');
    }
    if (provider.verificationStatus === VerificationStatus.REJECTED) {
      throw new ConflictException('Rejected provider must submit a new verification request before approval');
    }
    provider.verificationStatus = VerificationStatus.APPROVED;
    provider.status = AccountStatus.ACTIVE;
    provider.verifiedAt = new Date();
    provider.verifiedBy = adminId;
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

  async rejectProvider(providerId: string, reason: string, adminId: string) {
    const normalizedReason = reason?.trim();
    if (!normalizedReason) throw new BadRequestException('Rejection reason is required');
    if (normalizedReason.length > 1000) throw new BadRequestException('Rejection reason must not exceed 1000 characters');
    const provider = await this.findProvider(providerId);
    if (provider.verificationStatus !== VerificationStatus.PENDING) {
      throw new ConflictException('Only pending providers can be rejected');
    }
    provider.verificationStatus = VerificationStatus.REJECTED;
    provider.status = AccountStatus.PENDING;
    provider.verifiedAt = new Date();
    provider.verifiedBy = adminId;
    provider.rejectionReason = normalizedReason;
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

  private async findProvider(providerId: string) {
    if (!Types.ObjectId.isValid(providerId)) throw new BadRequestException('Invalid provider ID');
    const provider = await this.providerRepository.getOne({ _id: providerId, role: UserRole.PROVIDER });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }
}
