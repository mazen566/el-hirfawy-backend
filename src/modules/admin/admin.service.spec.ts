import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccountStatus,
  UserRole,
  VerificationStatus,
} from '../../common/index.js';
import { ProviderRepository, UserRepository } from '../../models/index.js';
import { AdminService } from './admin.service.js';

vi.mock('cloudinary', () => ({
  v2: {
    url: vi.fn(),
  },
}));

describe('AdminService', () => {
  let service: AdminService;

  const ADMIN_ID = '6aea6eb4160bf14f2c57de50';
  const USER_ID = '6aea6eb4160bf14f2c57de51';
  const PROVIDER_ID = '6aea6eb4160bf14f2c57de52';

  const mockProviderRepository = {
    getOne: vi.fn(),
  };

  const mockUserRepository = {
    getOne: vi.fn(),
    getAllUsers: vi.fn(),
  };

  const createMockUser = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(USER_ID),
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.CUSTOMER,
    status: AccountStatus.ACTIVE,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const createMockProvider = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(PROVIDER_ID),
    firstName: 'Provider',
    lastName: 'Test',
    role: UserRole.PROVIDER,
    status: AccountStatus.PENDING,
    verificationStatus: VerificationStatus.PENDING,
    idCardImageKey: 'id-card-image',
    selfieImageKey: 'selfie-image',
    aiResult: 95,
    verifiedAt: undefined,
    verifiedBy: undefined,
    rejectionReason: undefined,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    service = new AdminService(
      mockProviderRepository as unknown as ProviderRepository,
      mockUserRepository as unknown as UserRepository,
    );
  });

  // ==================================
  // GET ALL USERS
  // ==================================

  describe('getAllUsers', () => {
    it('should return all users successfully', async () => {
      const users = [
        createMockUser(),
        createMockUser({
          _id: new Types.ObjectId(),
          firstName: 'Jane',
        }),
      ];

      mockUserRepository.getAllUsers.mockResolvedValue(users);

      const result = await service.getAllUsers();

      expect(result).toEqual({
        success: true,
        count: 2,
        data: users,
      });

      expect(mockUserRepository.getAllUsers).toHaveBeenCalledTimes(1);
    });

    it('should return empty list when there are no users', async () => {
      mockUserRepository.getAllUsers.mockResolvedValue([]);

      const result = await service.getAllUsers();

      expect(result).toEqual({
        success: true,
        count: 0,
        data: [],
      });
    });

    it('should propagate repository errors', async () => {
      mockUserRepository.getAllUsers.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getAllUsers()).rejects.toThrow('Database error');
    });
  });

  // ==================================
  // APPROVE PROVIDER
  // ==================================

  describe('approveProvider', () => {
    it('should approve a pending provider successfully', async () => {
      const provider = createMockProvider();

      mockProviderRepository.getOne.mockResolvedValue(provider);

      const result = await service.approveProvider(PROVIDER_ID, ADMIN_ID);

      expect(provider.verificationStatus).toBe(VerificationStatus.APPROVED);

      expect(provider.status).toBe(AccountStatus.ACTIVE);

      expect(provider.verifiedAt).toBeInstanceOf(Date);

      expect(provider.verifiedBy).toBe(ADMIN_ID);

      expect(provider.rejectionReason).toBeUndefined();

      expect(provider.save).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        success: true,
        message: 'Provider approved successfully',
        data: {
          id: provider._id,
          verificationStatus: VerificationStatus.APPROVED,
          status: AccountStatus.ACTIVE,
          verifiedAt: provider.verifiedAt,
          verifiedBy: ADMIN_ID,
        },
      });
    });

    it('should reject invalid provider ID', async () => {
      await expect(
        service.approveProvider('invalid-id', ADMIN_ID),
      ).rejects.toThrow(BadRequestException);

      expect(mockProviderRepository.getOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockProviderRepository.getOne.mockResolvedValue(null);

      await expect(
        service.approveProvider(PROVIDER_ID, ADMIN_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject provider that is not pending', async () => {
      const provider = createMockProvider({
        verificationStatus: VerificationStatus.APPROVED,
      });

      mockProviderRepository.getOne.mockResolvedValue(provider);

      await expect(
        service.approveProvider(PROVIDER_ID, ADMIN_ID),
      ).rejects.toThrow(ConflictException);

      expect(provider.save).not.toHaveBeenCalled();
    });
  });

  // ==================================
  // REJECT PROVIDER
  // ==================================

  describe('rejectProvider', () => {
    it('should reject a pending provider successfully', async () => {
      const provider = createMockProvider();

      mockProviderRepository.getOne.mockResolvedValue(provider);

      const result = await service.rejectProvider(
        PROVIDER_ID,
        'Invalid identity documents',
        ADMIN_ID,
      );

      expect(provider.verificationStatus).toBe(VerificationStatus.REJECTED);

      expect(provider.status).toBe(AccountStatus.PENDING);

      expect(provider.rejectionReason).toBe('Invalid identity documents');

      expect(provider.verifiedAt).toBeInstanceOf(Date);

      expect(provider.verifiedBy).toBe(ADMIN_ID);

      expect(provider.save).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        success: true,
        message: 'Provider rejected successfully',
        data: {
          id: provider._id,
          verificationStatus: VerificationStatus.REJECTED,
          status: AccountStatus.PENDING,
          rejectionReason: 'Invalid identity documents',
          verifiedAt: provider.verifiedAt,
          verifiedBy: ADMIN_ID,
        },
      });
    });

    it('should reject invalid provider ID', async () => {
      await expect(
        service.rejectProvider('invalid-id', 'Invalid documents', ADMIN_ID),
      ).rejects.toThrow(BadRequestException);

      expect(mockProviderRepository.getOne).not.toHaveBeenCalled();
    });

    it('should reject empty rejection reason', async () => {
      await expect(
        service.rejectProvider(PROVIDER_ID, '', ADMIN_ID),
      ).rejects.toThrow(BadRequestException);

      expect(mockProviderRepository.getOne).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only rejection reason', async () => {
      await expect(
        service.rejectProvider(PROVIDER_ID, '   ', ADMIN_ID),
      ).rejects.toThrow(BadRequestException);

      expect(mockProviderRepository.getOne).not.toHaveBeenCalled();
    });

    it('should reject reason longer than 1000 characters', async () => {
      const reason = 'a'.repeat(1001);

      await expect(
        service.rejectProvider(PROVIDER_ID, reason, ADMIN_ID),
      ).rejects.toThrow(BadRequestException);

      expect(mockProviderRepository.getOne).not.toHaveBeenCalled();
    });

    it('should trim rejection reason before saving', async () => {
      const provider = createMockProvider();

      mockProviderRepository.getOne.mockResolvedValue(provider);

      await service.rejectProvider(
        PROVIDER_ID,
        '  Invalid documents  ',
        ADMIN_ID,
      );

      expect(provider.rejectionReason).toBe('Invalid documents');
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockProviderRepository.getOne.mockResolvedValue(null);

      await expect(
        service.rejectProvider(PROVIDER_ID, 'Invalid documents', ADMIN_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject provider that is not pending', async () => {
      const provider = createMockProvider({
        verificationStatus: VerificationStatus.REJECTED,
      });

      mockProviderRepository.getOne.mockResolvedValue(provider);

      await expect(
        service.rejectProvider(PROVIDER_ID, 'Invalid documents', ADMIN_ID),
      ).rejects.toThrow(ConflictException);

      expect(provider.save).not.toHaveBeenCalled();
    });
  });

  // ==================================
  // SUSPEND USER
  // ==================================

  describe('suspendUser', () => {
    it('should suspend an active user successfully', async () => {
      const user = createMockUser();

      mockUserRepository.getOne.mockResolvedValue(user);

      const result = await service.suspendUser(USER_ID, ADMIN_ID);

      expect(user.status).toBe(AccountStatus.SUSPENDED);

      expect(user.save).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        success: true,
        message: 'User suspended successfully',
        data: {
          id: user._id,
          status: AccountStatus.SUSPENDED,
        },
      });
    });

    it('should reject invalid user ID', async () => {
      await expect(service.suspendUser('invalid-id', ADMIN_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUserRepository.getOne).not.toHaveBeenCalled();
    });

    it('should prevent admin from suspending own account', async () => {
      await expect(service.suspendUser(ADMIN_ID, ADMIN_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUserRepository.getOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.getOne.mockResolvedValue(null);

      await expect(service.suspendUser(USER_ID, ADMIN_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject already suspended user', async () => {
      const user = createMockUser({
        status: AccountStatus.SUSPENDED,
      });

      mockUserRepository.getOne.mockResolvedValue(user);

      await expect(service.suspendUser(USER_ID, ADMIN_ID)).rejects.toThrow(
        ConflictException,
      );

      expect(user.save).not.toHaveBeenCalled();
    });

    it('should suspend a provider account', async () => {
      const provider = createMockUser({
        role: UserRole.PROVIDER,
        status: AccountStatus.ACTIVE,
      });

      mockUserRepository.getOne.mockResolvedValue(provider);

      await service.suspendUser(USER_ID, ADMIN_ID);

      expect(provider.status).toBe(AccountStatus.SUSPENDED);
      expect(provider.save).toHaveBeenCalledTimes(1);
    });
  });

  // ==================================
  // ACTIVATE USER
  // ==================================

  describe('activateUser', () => {
    it('should activate a suspended customer successfully', async () => {
      const user = createMockUser({
        status: AccountStatus.SUSPENDED,
      });

      mockUserRepository.getOne.mockResolvedValue(user);

      const result = await service.activateUser(USER_ID);

      expect(user.status).toBe(AccountStatus.ACTIVE);

      expect(user.save).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        success: true,
        message: 'User activated successfully',
        data: {
          id: user._id,
          status: AccountStatus.ACTIVE,
        },
      });
    });

    it('should reject invalid user ID', async () => {
      await expect(service.activateUser('invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUserRepository.getOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.getOne.mockResolvedValue(null);

      await expect(service.activateUser(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject already active user', async () => {
      const user = createMockUser({
        status: AccountStatus.ACTIVE,
      });

      mockUserRepository.getOne.mockResolvedValue(user);

      await expect(service.activateUser(USER_ID)).rejects.toThrow(
        ConflictException,
      );

      expect(user.save).not.toHaveBeenCalled();
    });

    it('should reject provider that has not been approved', async () => {
      const provider = createMockUser({
        role: UserRole.PROVIDER,
        status: AccountStatus.SUSPENDED,
        verificationStatus: VerificationStatus.PENDING,
      });

      mockUserRepository.getOne.mockResolvedValue(provider);

      await expect(service.activateUser(USER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(provider.save).not.toHaveBeenCalled();
    });

    it('should activate an approved provider', async () => {
      const provider = createMockUser({
        role: UserRole.PROVIDER,
        status: AccountStatus.SUSPENDED,
        verificationStatus: VerificationStatus.APPROVED,
      });

      mockUserRepository.getOne.mockResolvedValue(provider);

      const result = await service.activateUser(USER_ID);

      expect(provider.status).toBe(AccountStatus.ACTIVE);

      expect(provider.save).toHaveBeenCalledTimes(1);

      expect(result.data.status).toBe(AccountStatus.ACTIVE);
    });

    it('should reject a rejected provider', async () => {
      const provider = createMockUser({
        role: UserRole.PROVIDER,
        status: AccountStatus.PENDING,
        verificationStatus: VerificationStatus.REJECTED,
      });

      mockUserRepository.getOne.mockResolvedValue(provider);

      await expect(service.activateUser(USER_ID)).rejects.toThrow(
        BadRequestException,
      );

      expect(provider.save).not.toHaveBeenCalled();
    });
  });

  // ==================================
  // GET PROVIDER VERIFICATION
  // ==================================

  describe('getProviderVerification', () => {
    it('should return provider verification documents successfully', async () => {
      const provider = createMockProvider();

      vi.mocked(cloudinary.url)
        .mockReturnValueOnce('https://cloudinary.com/id-card')
        .mockReturnValueOnce('https://cloudinary.com/selfie');

      mockProviderRepository.getOne.mockResolvedValue(provider);

      const result = await service.getProviderVerification(PROVIDER_ID);

      expect(mockProviderRepository.getOne).toHaveBeenCalledWith({
        _id: PROVIDER_ID,
        role: UserRole.PROVIDER,
      });

      expect(cloudinary.url).toHaveBeenNthCalledWith(1, 'id-card-image', {
        secure: true,
      });

      expect(cloudinary.url).toHaveBeenNthCalledWith(2, 'selfie-image', {
        secure: true,
      });

      expect(result).toEqual({
        success: true,
        message: 'Provider verification details retrieved successfully',
        data: {
          idCardImageUrl: 'https://cloudinary.com/id-card',
          selfieImageUrl: 'https://cloudinary.com/selfie',
        },
        aiResult: 95,
      });
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockProviderRepository.getOne.mockResolvedValue(null);

      await expect(
        service.getProviderVerification(PROVIDER_ID),
      ).rejects.toThrow(NotFoundException);

      expect(cloudinary.url).not.toHaveBeenCalled();
    });

    it('should reject when ID card image is missing', async () => {
      const provider = createMockProvider({
        idCardImageKey: null,
      });

      mockProviderRepository.getOne.mockResolvedValue(provider);

      await expect(
        service.getProviderVerification(PROVIDER_ID),
      ).rejects.toThrow(BadRequestException);

      expect(cloudinary.url).not.toHaveBeenCalled();
    });

    it('should reject when selfie image is missing', async () => {
      const provider = createMockProvider({
        selfieImageKey: null,
      });

      mockProviderRepository.getOne.mockResolvedValue(provider);

      await expect(
        service.getProviderVerification(PROVIDER_ID),
      ).rejects.toThrow(BadRequestException);

      expect(cloudinary.url).not.toHaveBeenCalled();
    });
  });
});
