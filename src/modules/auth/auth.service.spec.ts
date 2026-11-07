import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { AuthFactoryService } from './factory/index.js';
import { TokenService } from './token.service.js';
import { AccountStatus, UserRole } from '../../common/index.js';
import { UserRepository } from '../../models/index.js';

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock('../../common/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../common/index.js')>();

  return {
    ...actual,
    sendMail: mocks.sendMail,
  };
});

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: {
    getOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let tokenService: {
    issueTokens: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    userRepository = {
      getOne: vi.fn(),
      create: vi.fn(),
      updateOne: vi.fn(),
    };

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-token'),
      verify: vi.fn(),
    };

    tokenService = {
      issueTokens: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: AuthFactoryService,
          useValue: {
            createCustomer: vi.fn(),
            createProvider: vi.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: tokenService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  // ======================================================
  // 1. REGISTER TESTS
  // ======================================================

  describe('register', () => {
    it('should register a user successfully', async () => {
      const user = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '01000000000',
        password: 'Password123',
        otp: '123456',
        role: UserRole.CUSTOMER,
      };

      const createdUser = {
        ...user,
        _id: 'user-id',
        otpExpiry: new Date(),
        refreshToken: 'hashed-refresh-token',
      };

      userRepository.getOne.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);
      mocks.sendMail.mockResolvedValue(undefined);

      const result = await authService.register(user as any);

      expect(userRepository.getOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        phone: '01000000000',
      });

      expect(userRepository.create).toHaveBeenCalledWith(user);
      expect(mocks.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: 'Account Verification',
        }),
      );

      // Sensitive fields must not be returned
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('otp');
      expect(result).not.toHaveProperty('otpExpiry');
      expect(result).not.toHaveProperty('refreshToken');
    });

    // Admin registration must be rejected
    it('should throw BadRequestException when registering as Admin', async () => {
      const user = {
        role: UserRole.ADMIN,
      };

      await expect(authService.register(user as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(userRepository.create).not.toHaveBeenCalled();
    });

    // Duplicate user must be rejected
    it('should throw ConflictException when user already exists', async () => {
      const user = {
        email: 'test@example.com',
        phone: '01000000000',
        role: UserRole.CUSTOMER,
      };

      userRepository.getOne.mockResolvedValue(user);

      await expect(authService.register(user as any)).rejects.toThrow(
        ConflictException,
      );

      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // 2. VERIFY ACCOUNT TESTS
  // ======================================================

  describe('verifyAccount', () => {
    const dto = {
      email: 'test@example.com',
      otp: '123456',
    };

    // Successful email verification
    it('should verify account successfully', async () => {
      const user = {
        email: dto.email,
        otp: dto.otp,
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
        emailVerified: false,
      };

      userRepository.getOne.mockResolvedValue(user);
      userRepository.updateOne.mockResolvedValue({});

      await authService.verifyAccount(dto as any);

      expect(userRepository.getOne).toHaveBeenCalledWith({
        email: dto.email,
      });

      expect(userRepository.updateOne).toHaveBeenCalledWith(
        { email: dto.email },
        {
          emailVerified: true,
          status: AccountStatus.ACTIVE,
          $unset: {
            otp: '',
            otpExpiry: '',
          },
        },
      );
    });

    // User does not exist
    it('should throw UnauthorizedException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(authService.verifyAccount(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Email is already verified
    it('should throw ConflictException when email is already verified', async () => {
      userRepository.getOne.mockResolvedValue({
        emailVerified: true,
      });

      await expect(authService.verifyAccount(dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    // Incorrect OTP
    it('should throw UnauthorizedException when OTP is invalid', async () => {
      userRepository.getOne.mockResolvedValue({
        emailVerified: false,
        otp: '654321',
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(authService.verifyAccount(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Expired OTP
    it('should throw UnauthorizedException when OTP has expired', async () => {
      userRepository.getOne.mockResolvedValue({
        emailVerified: false,
        otp: dto.otp,
        otpExpiry: new Date(Date.now() - 1000),
      });

      await expect(authService.verifyAccount(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ======================================================
  // 3. LOGIN TESTS
  // ======================================================

  describe('login', () => {
    const password = 'Password123';

    // Successful login
    it('should login successfully', async () => {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = {
        _id: 'user-id',
        email: 'test@example.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        status: AccountStatus.ACTIVE,
      };

      userRepository.getOne.mockResolvedValue(user);
      userRepository.updateOne.mockResolvedValue({});

      const result = await authService.login({
        email: ' TEST@example.com ',
        password,
      } as any);

      expect(userRepository.getOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(userRepository.updateOne).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });

    // User does not exist
    it('should throw UnauthorizedException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'test@example.com',
          password,
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    // Account is not active
    it('should throw UnauthorizedException when account is not active', async () => {
      const user = {
        password: await bcrypt.hash(password, 10),
        status: AccountStatus.PENDING,
      };

      userRepository.getOne.mockResolvedValue(user);

      await expect(
        authService.login({
          email: 'test@example.com',
          password,
        } as any),
      ).rejects.toThrow('Account is not active');
    });

    // Incorrect password
    it('should throw UnauthorizedException when password is incorrect', async () => {
      const user = {
        password: await bcrypt.hash(password, 10),
        status: AccountStatus.ACTIVE,
      };

      userRepository.getOne.mockResolvedValue(user);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword',
        } as any),
      ).rejects.toThrow('Invalid password');
    });
  });

  // ======================================================
  // 4. REFRESH TOKEN TESTS
  // ======================================================

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    // Successful token refresh and rotation
    it('should refresh tokens successfully', async () => {
      const hashedToken = await bcrypt.hash(refreshToken, 10);

      jwtService.verify.mockReturnValue({
        _id: 'user-id',
      });

      userRepository.getOne.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
        refreshToken: hashedToken,
      });

      userRepository.updateOne.mockResolvedValue({});

      const result = await authService.refreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: process.env.REFRESH_JWT_SECRET,
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(userRepository.updateOne).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });

    // Invalid JWT
    it('should reject invalid JWT', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // User does not exist
    it('should reject when user does not exist', async () => {
      jwtService.verify.mockReturnValue({
        _id: 'user-id',
      });

      userRepository.getOne.mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Refresh token is not stored
    it('should reject when refresh token is not stored', async () => {
      jwtService.verify.mockReturnValue({
        _id: 'user-id',
      });

      userRepository.getOne.mockResolvedValue({
        _id: 'user-id',
        refreshToken: null,
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Stored refresh token does not match
    it('should reject when stored refresh token does not match', async () => {
      const differentToken = await bcrypt.hash('another-token', 10);

      jwtService.verify.mockReturnValue({
        _id: 'user-id',
      });

      userRepository.getOne.mockResolvedValue({
        _id: 'user-id',
        refreshToken: differentToken,
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ======================================================
  // 5. LOGOUT TESTS
  // ======================================================

  describe('logout', () => {
    // Successful logout
    it('should logout successfully', async () => {
      userRepository.getOne.mockResolvedValue({
        _id: 'user-id',
      });

      userRepository.updateOne.mockResolvedValue({});

      await authService.logout('user-id');

      expect(userRepository.getOne).toHaveBeenCalledWith({
        _id: 'user-id',
      });

      expect(userRepository.updateOne).toHaveBeenCalledWith(
        { _id: 'user-id' },
        {
          $unset: {
            refreshToken: 1,
          },
        },
      );
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(authService.logout('user-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(userRepository.updateOne).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // 6. FORGOT PASSWORD TESTS
  // ======================================================

  describe('forgotPassword', () => {
    // Successful password reset request
    it('should generate OTP and send reset email', async () => {
      userRepository.getOne.mockResolvedValue({
        email: 'test@example.com',
      });

      userRepository.updateOne.mockResolvedValue({});

      await authService.forgotPassword({
        email: ' TEST@example.com ',
      } as any);

      expect(userRepository.getOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });

      expect(userRepository.updateOne).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        expect.objectContaining({
          otp: expect.any(String),
          otpExpiry: expect.any(Date),
        }),
      );

      expect(mocks.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Password Reset',
        }),
      );
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(
        authService.forgotPassword({
          email: 'test@example.com',
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mocks.sendMail).not.toHaveBeenCalled();
    });
  });

  // ======================================================
  // 7. RESET PASSWORD TESTS
  // ======================================================

  describe('resetPassword', () => {
    const dto = {
      email: 'test@example.com',
      otp: '123456',
      newPassword: 'NewPassword123',
    };

    // Successful password reset
    it('should reset password successfully', async () => {
      userRepository.getOne.mockResolvedValue({
        otp: dto.otp,
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      });

      userRepository.updateOne.mockResolvedValue({});

      await authService.resetPassword(dto as any);

      expect(userRepository.updateOne).toHaveBeenCalledWith(
        { email: dto.email },
        expect.objectContaining({
          password: expect.any(String),
          $unset: {
            otp: 1,
            otpExpiry: 1,
            refreshToken: 1,
          },
        }),
      );

      const update = userRepository.updateOne.mock.calls[0][1];

      expect(await bcrypt.compare(dto.newPassword, update.password)).toBe(true);
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(authService.resetPassword(dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    // OTP does not exist
    it('should throw BadRequestException when OTP does not exist', async () => {
      userRepository.getOne.mockResolvedValue({
        otp: null,
      });

      await expect(authService.resetPassword(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Incorrect OTP
    it('should throw UnauthorizedException when OTP is invalid', async () => {
      userRepository.getOne.mockResolvedValue({
        otp: '654321',
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(authService.resetPassword(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Expired OTP
    it('should throw UnauthorizedException when OTP has expired', async () => {
      userRepository.getOne.mockResolvedValue({
        otp: dto.otp,
        otpExpiry: new Date(Date.now() - 1000),
      });

      await expect(authService.resetPassword(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ======================================================
  // 8. CHANGE PASSWORD TESTS
  // ======================================================

  describe('changePassword', () => {
    const currentPassword = 'OldPassword123';
    const newPassword = 'NewPassword123';

    // Successful password change
    it('should change password successfully', async () => {
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

      userRepository.getOne.mockResolvedValue({
        password: hashedPassword,
      });

      userRepository.updateOne.mockResolvedValue({});

      await authService.changePassword('user-id', {
        currentPassword,
        newPassword,
      } as any);

      expect(userRepository.updateOne).toHaveBeenCalledWith(
        { _id: 'user-id' },
        {
          $set: {
            password: expect.any(String),
          },
          $unset: {
            refreshToken: 1,
          },
        },
      );

      const update = userRepository.updateOne.mock.calls[0][1];

      expect(await bcrypt.compare(newPassword, update.$set.password)).toBe(
        true,
      );
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(
        authService.changePassword('user-id', {
          currentPassword,
          newPassword,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    // Incorrect current password
    it('should throw UnauthorizedException when current password is incorrect', async () => {
      userRepository.getOne.mockResolvedValue({
        password: await bcrypt.hash(currentPassword, 10),
      });

      await expect(
        authService.changePassword('user-id', {
          currentPassword: 'WrongPassword',
          newPassword,
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    // New password is the same as current password
    it('should throw BadRequestException when new password is the same', async () => {
      userRepository.getOne.mockResolvedValue({
        password: await bcrypt.hash(currentPassword, 10),
      });

      await expect(
        authService.changePassword('user-id', {
          currentPassword,
          newPassword: currentPassword,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ======================================================
  // 9. RESEND OTP TESTS
  // ======================================================

  describe('resendOtp', () => {
    const dto = {
      email: 'test@example.com',
    };

    // Successful OTP resend
    it('should generate and send a new OTP successfully', async () => {
      userRepository.getOne.mockResolvedValue({
        _id: 'user-id',
        email: dto.email,
        emailVerified: false,
      });

      userRepository.updateOne.mockResolvedValue({});

      await authService.resendOtp(dto as any);

      expect(userRepository.updateOne).toHaveBeenCalledWith(
        { _id: 'user-id' },
        {
          $set: {
            otp: expect.any(String),
            otpExpiry: expect.any(Date),
          },
        },
      );

      expect(mocks.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: dto.email,
          subject: 'Account Verification',
        }),
      );
    });

    // User does not exist
    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.getOne.mockResolvedValue(null);

      await expect(authService.resendOtp(dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    // Account is already verified
    it('should throw BadRequestException when account is already verified', async () => {
      userRepository.getOne.mockResolvedValue({
        emailVerified: true,
      });

      await expect(authService.resendOtp(dto as any)).rejects.toThrow(
        BadRequestException,
      );

      expect(userRepository.updateOne).not.toHaveBeenCalled();
    });
  });
});
