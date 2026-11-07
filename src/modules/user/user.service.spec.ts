import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose';
import { UserService } from './user.service.js';
import { CloudinaryService, UserRole } from '../../common/index.js';
import { ProviderRepository, UserRepository } from '../../models/index.js';
import { AiVerificationService } from '../ai/ai.service.js';

const mocks = vi.hoisted(() => ({
  validateImage: vi.fn(),
}));
vi.mock('../../common/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../common/index.js')>();

  return {
    ...actual,
    validateImage: mocks.validateImage,
  };
});

describe('UserService', () => {
  let userService: UserService;
  let userRepository: {
    getOne: ReturnType<typeof vi.fn>;
    getAllUsers: ReturnType<typeof vi.fn>;
  };
  let providerRepository: {
    getOne: ReturnType<typeof vi.fn>;
  };
  let cloudinaryService: {
    uploadImage: ReturnType<typeof vi.fn>;
    deleteImage: ReturnType<typeof vi.fn>;
  };
  let aiVerificationService: {
    verifyIdentity: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    userRepository = {
      getOne: vi.fn(),
      getAllUsers: vi.fn(),
    };
    providerRepository = {
      getOne: vi.fn(),
    };
    cloudinaryService = {
      uploadImage: vi.fn(),
      deleteImage: vi.fn(),
    };
    aiVerificationService = {
      verifyIdentity: vi.fn(),
    };
    mocks.validateImage.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: ProviderRepository,
          useValue: providerRepository,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryService,
        },
        {
          provide: AiVerificationService,
          useValue: aiVerificationService,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  // ======================================================
  // 1. COMPLETE PROFILE TESTS
  // ======================================================

  describe('completeProfile', () => {
    const userId = 'user-id';

    const address = {
      governorate: 'Giza',
      district: 'Oseem',
      street: 'Main Street',
    };

    // Customer profile completion
    it('should complete customer profile successfully', async () => {
      const user = {
        role: UserRole.CUSTOMER,
        address: null as any,
        save: vi.fn().mockResolvedValue(undefined),
      };

      userRepository.getOne.mockResolvedValue(user);

      const result = await userService.completeProfile(userId, {
        address,
      } as any);

      expect(userRepository.getOne).toHaveBeenCalledWith({
        _id: userId,
      });

      expect(user.address).toEqual(address);
      expect(user.save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Profile completed successfully',
      });
    });

    // Provider profile completion
    it('should complete provider profile successfully', async () => {
      const user = {
        role: UserRole.PROVIDER,
      };

      const provider = {
        address: null,
        service: null,
        experience: null,
        workingHours: null,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const body = {
        address,
        service: 'Painting',
        experience: '5 years',
        workingHours: {
          from: '09:00',
          to: '17:00',
        },
      };

      userRepository.getOne.mockResolvedValue(user);
      providerRepository.getOne.mockResolvedValue(provider);

      const result = await userService.completeProfile(userId, body as any);

      expect(providerRepository.getOne).toHaveBeenCalledWith({
        _id: userId,
      });

      expect(provider.address).toEqual(address);
      expect(provider.service).toBe(body.service);
      expect(provider.experience).toBe(body.experience);
      expect(provider.workingHours).toEqual(body.workingHours);

      expect(provider.save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Profile completed successfully',
      });
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(
        userService.completeProfile(userId, { address } as any),
      ).rejects.toThrow(NotFoundException);
    });

    // Address is missing
    it('should throw BadRequestException when address is incomplete', async () => {
      userRepository.getOne.mockResolvedValue({
        role: UserRole.CUSTOMER,
      });

      await expect(
        userService.completeProfile(userId, {
          address: {
            governorate: 'Giza',
            district: '',
            street: 'Main Street',
          },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    // Provider required fields are missing
    it('should throw BadRequestException when provider fields are missing', async () => {
      userRepository.getOne.mockResolvedValue({
        role: UserRole.PROVIDER,
      });

      await expect(
        userService.completeProfile(userId, { address } as any),
      ).rejects.toThrow(BadRequestException);

      expect(providerRepository.getOne).not.toHaveBeenCalled();
    });

    // Provider profile does not exist
    it('should throw NotFoundException when provider profile does not exist', async () => {
      userRepository.getOne.mockResolvedValue({
        role: UserRole.PROVIDER,
      });

      providerRepository.getOne.mockResolvedValue(null);

      await expect(
        userService.completeProfile(userId, {
          address,
          service: 'Painting',
          experience: '5 years',
          workingHours: {
            from: '09:00',
            to: '17:00',
          },
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ======================================================
  // 2. UPDATE LOCATION TESTS
  // ======================================================

  describe('updateLocation', () => {
    const userId = 'user-id';

    const body = {
      longitude: 31.123,
      latitude: 30.123,
    };

    // Successful location update
    it('should update user location successfully', async () => {
      const user = {
        location: null,
        save: vi.fn().mockResolvedValue(undefined),
      };

      userRepository.getOne.mockResolvedValue(user);

      const result = await userService.updateLocation(userId, body as any);

      expect(userRepository.getOne).toHaveBeenCalledWith({
        _id: userId,
      });

      expect(user.location).toEqual({
        type: 'Point',
        coordinates: [body.longitude, body.latitude],
      });

      expect(user.save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Location updated successfully',
        location: {
          type: 'Point',
          coordinates: [body.longitude, body.latitude],
        },
      });
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(
        userService.updateLocation(userId, body as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ======================================================
  // 3. GET ALL USERS TESTS
  // ======================================================

  describe('getAllUsers', () => {
    // Successful retrieval
    it('should retrieve all users successfully', async () => {
      const users = [
        {
          _id: 'user-1',
          firstName: 'Ahmed',
        },
        {
          _id: 'user-2',
          firstName: 'Mohamed',
        },
      ];

      userRepository.getAllUsers.mockResolvedValue(users);

      const result = await userService.getAllUsers();

      expect(userRepository.getAllUsers).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Users retrieved successfully',
        count: 2,
        data: users,
      });
    });

    // Empty users list
    it('should return empty data when no users exist', async () => {
      userRepository.getAllUsers.mockResolvedValue([]);

      const result = await userService.getAllUsers();

      expect(result).toEqual({
        message: 'Users retrieved successfully',
        count: 0,
        data: [],
      });
    });
  });

  // ======================================================
  // 4. GET USER BY ID TESTS
  // ======================================================

  describe('getUserById', () => {
    const userId = new Types.ObjectId().toString();

    // Successful retrieval
    it('should retrieve user by ID successfully', async () => {
      const user = {
        _id: userId,
        firstName: 'Ahmed',
        email: 'test@example.com',
      };

      userRepository.getOne.mockResolvedValue(user);

      const result = await userService.getUserById(userId);

      expect(userRepository.getOne).toHaveBeenCalledWith(
        { _id: userId },
        {
          password: 0,
          otp: 0,
          otpExpiry: 0,
          refreshToken: 0,
        },
      );

      expect(result).toEqual({
        message: 'User retrieved successfully',
        data: user,
      });
    });

    // Invalid MongoDB ObjectId
    it('should throw BadRequestException when user ID is invalid', async () => {
      await expect(userService.getUserById('invalid-id')).rejects.toThrow(
        BadRequestException,
      );

      expect(userRepository.getOne).not.toHaveBeenCalled();
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(userService.getUserById(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ======================================================
  // 5. UPLOAD IDENTITY IMAGES TESTS
  // ======================================================

  describe('uploadIdentityImages', () => {
    const userId = 'provider-id';

    const idCardFile = {
      originalname: 'id-card.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('id-card-image'),
    } as Express.Multer.File;

    const selfieFile = {
      originalname: 'selfie.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('selfie-image'),
    } as Express.Multer.File;

    const files = {
      idCardImage: [idCardFile],
      selfieImage: [selfieFile],
    };

    // Successful identity image upload and AI verification
    it('should upload identity images and save AI result successfully', async () => {
      const provider = {
        idCardImageKey: null,
        selfieImageKey: null,
        aiResult: null,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const idCardUpload = {
        public_id: 'identity/id-card-123',
        secure_url: 'https://cloudinary.com/id-card.jpg',
      };

      const selfieUpload = {
        public_id: 'identity/selfie-123',
        secure_url: 'https://cloudinary.com/selfie.jpg',
      };

      providerRepository.getOne.mockResolvedValue(provider);

      aiVerificationService.verifyIdentity.mockResolvedValue({
        success: true,
        similarity_score: 0.8121,
        decision: 'not_calibrated',
        message: 'Identity analyzed successfully',
      });

      cloudinaryService.uploadImage
        .mockResolvedValueOnce(idCardUpload)
        .mockResolvedValueOnce(selfieUpload);

      const result = await userService.uploadIdentityImages(userId, files);

      // Provider lookup
      expect(providerRepository.getOne).toHaveBeenCalledWith({
        _id: userId,
      });

      // Image validation
      expect(mocks.validateImage).toHaveBeenCalledTimes(2);

      // AI verification
      expect(aiVerificationService.verifyIdentity).toHaveBeenCalledWith(
        idCardFile,
        selfieFile,
      );

      // Cloudinary uploads
      expect(cloudinaryService.uploadImage).toHaveBeenCalledTimes(2);

      expect(cloudinaryService.uploadImage).toHaveBeenNthCalledWith(
        1,
        idCardFile,
        'el-hirfawy/identity/id-cards',
      );

      expect(cloudinaryService.uploadImage).toHaveBeenNthCalledWith(
        2,
        selfieFile,
        'el-hirfawy/identity/selfies',
      );

      // Provider data
      expect(provider.idCardImageKey).toBe(idCardUpload.public_id);
      expect(provider.selfieImageKey).toBe(selfieUpload.public_id);
      expect(provider.aiResult).toBe(81.21);

      expect(provider.save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Identity images uploaded and analyzed successfully',
        data: {
          idCardImage: idCardUpload,
          selfieImage: selfieUpload,
          aiResult: 81.21,
          aiDecision: 'not_calibrated',
          aiMessage: 'Identity analyzed successfully',
        },
      });
    });

    // Missing identity images
    it('should throw BadRequestException when one or both images are missing', async () => {
      await expect(
        userService.uploadIdentityImages(userId, {
          idCardImage: [idCardFile],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(providerRepository.getOne).not.toHaveBeenCalled();
      expect(aiVerificationService.verifyIdentity).not.toHaveBeenCalled();
    });

    // Provider does not exist
    it('should throw NotFoundException when provider does not exist', async () => {
      providerRepository.getOne.mockResolvedValue(null);

      await expect(
        userService.uploadIdentityImages(userId, files),
      ).rejects.toThrow(NotFoundException);

      expect(mocks.validateImage).not.toHaveBeenCalled();
      expect(aiVerificationService.verifyIdentity).not.toHaveBeenCalled();
    });

    // Invalid image
    it('should reject when image validation fails', async () => {
      providerRepository.getOne.mockResolvedValue({
        save: vi.fn(),
      });

      mocks.validateImage.mockRejectedValueOnce(
        new BadRequestException('Invalid image'),
      );

      await expect(
        userService.uploadIdentityImages(userId, files),
      ).rejects.toThrow(BadRequestException);

      expect(aiVerificationService.verifyIdentity).not.toHaveBeenCalled();
      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    // AI verification returns unsuccessful response
    it('should throw BadRequestException when AI verification fails', async () => {
      providerRepository.getOne.mockResolvedValue({
        save: vi.fn(),
      });

      aiVerificationService.verifyIdentity.mockResolvedValue({
        success: false,
        similarity_score: 0.8,
      });

      await expect(
        userService.uploadIdentityImages(userId, files),
      ).rejects.toThrow(BadRequestException);

      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    // AI returns invalid similarity score
    it('should throw BadRequestException when AI similarity score is invalid', async () => {
      providerRepository.getOne.mockResolvedValue({
        save: vi.fn(),
      });

      aiVerificationService.verifyIdentity.mockResolvedValue({
        success: true,
        similarity_score: 1.5,
      });

      await expect(
        userService.uploadIdentityImages(userId, files),
      ).rejects.toThrow(BadRequestException);

      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // 6. UPDATE PROFILE IMAGE TESTS
  // ======================================================

  describe('updateProfileImage', () => {
    const userId = 'user-id';

    const file = {
      originalname: 'profile.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('profile-image'),
    } as Express.Multer.File;

    // Successful profile image update
    it('should update profile image successfully', async () => {
      const user = {
        profileImageKey: null,
        save: vi.fn().mockResolvedValue(undefined),
      };

      const uploadedImage = {
        public_id: 'profile/profile-123',
        secure_url: 'https://cloudinary.com/profile.jpg',
      };

      userRepository.getOne.mockResolvedValue(user);

      cloudinaryService.uploadImage.mockResolvedValue(uploadedImage);

      const result = await userService.updateProfileImage(userId, file);

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        file,
        'el-hirfawy/profile-images',
      );

      expect(user.profileImageKey).toBe(uploadedImage.public_id);
      expect(user.save).toHaveBeenCalled();

      expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Profile image updated successfully',
        data: {
          profileImage: uploadedImage.secure_url,
        },
      });
    });

    // Delete old image after uploading new image
    it('should delete old profile image when it exists', async () => {
      const user = {
        profileImageKey: 'old-profile-image',
        save: vi.fn().mockResolvedValue(undefined),
      };

      const uploadedImage = {
        public_id: 'new-profile-image',
        secure_url: 'https://cloudinary.com/new-profile.jpg',
      };

      userRepository.getOne.mockResolvedValue(user);

      cloudinaryService.uploadImage.mockResolvedValue(uploadedImage);
      cloudinaryService.deleteImage.mockResolvedValue({ result: 'ok' });

      await userService.updateProfileImage(userId, file);

      expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(
        'old-profile-image',
      );

      expect(user.profileImageKey).toBe('new-profile-image');
      expect(user.save).toHaveBeenCalled();
    });

    // Missing file
    it('should throw BadRequestException when profile image is missing', async () => {
      await expect(
        userService.updateProfileImage(userId, undefined as any),
      ).rejects.toThrow(BadRequestException);

      expect(userRepository.getOne).not.toHaveBeenCalled();
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(
        userService.updateProfileImage(userId, file),
      ).rejects.toThrow(NotFoundException);

      expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // 7. GET PROFILE IMAGE TESTS
  // ======================================================

  describe('getProfileImage', () => {
    const userId = 'user-id';

    // Successful profile image retrieval
    it('should retrieve profile image successfully', async () => {
      const user = {
        profileImageKey: 'profile/profile-123',
      };

      userRepository.getOne.mockResolvedValue(user);

      const cloudinaryUrl = vi
        .spyOn(cloudinary, 'url')
        .mockReturnValue('https://cloudinary.com/profile.jpg');

      const result = await userService.getProfileImage(userId);

      expect(userRepository.getOne).toHaveBeenCalledWith({
        _id: userId,
      });

      expect(cloudinaryUrl).toHaveBeenCalledWith('profile/profile-123', {
        secure: true,
      });

      expect(result).toEqual({
        message: 'Profile image retrieved successfully',
        profileImageUrl: 'https://cloudinary.com/profile.jpg',
      });

      cloudinaryUrl.mockRestore();
    });

    // Profile image does not exist
    it('should return null when user has no profile image', async () => {
      userRepository.getOne.mockResolvedValue({
        profileImageKey: null,
      });

      const result = await userService.getProfileImage(userId);

      expect(result).toEqual({
        message: 'Profile image not found',
        profileImageUrl: null,
      });
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(userService.getProfileImage(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ======================================================
  // 8. REMOVE TESTS
  // ======================================================

  describe('remove', () => {
    // Successful remove response
    it('should return remove message', () => {
      const result = userService.remove(1);

      expect(result).toBe('This action removes a #1 user');
    });
  });
});
