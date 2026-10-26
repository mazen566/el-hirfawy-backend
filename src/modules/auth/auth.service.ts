import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  AccountStatus,
  AuthProvider,
  generateOTP,
  UserRole,
  sendMail,
} from '../../common/index.js';
import { UserRepository } from '../../models/index.js';
import { ChangePasswordDto } from './dto/changePassword.dto.js';
import { ForgotPasswordDto } from './dto/forgotPassword.dto.js';
import { LoginDTO } from './dto/login.dto.js';
import { GoogleLoginDto } from './dto/loginGoogle.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendOtpDto } from './dto/resendOtp.dto.js';
import { ResetPasswordDto } from './dto/resetPassword.dto.js';
import { VerifyAccountDTO } from './dto/verifyAccount.dto.js';
import { User } from './entities/auth.entity.js';
import { AuthFactoryService } from './factory/index.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly authFactoryService: AuthFactoryService,
    private readonly tokenService: TokenService,
  ) {}

  async register(user: User) {
    if (user.role === UserRole.ADMIN)
      throw new BadRequestException('Admin registration is not allowed');

    const UserExist = await this.userRepository.getOne({
      email: user.email.trim().toLowerCase(),
      phone: user.phone.trim(),
    });
    if (UserExist) throw new ConflictException('User already exists');

    const createdUser = await this.userRepository.create(user);
    await sendMail({
      to: user.email,
      subject: 'Account Verification',
      html: `<h1>your otp is ${user.otp}</h1>`,
    });
    const { password, otp, otpExpiry, refreshToken, ...userObj } = JSON.parse(
      JSON.stringify(createdUser),
    );
    return userObj as User;
  }

  async verifyAccount(verifyAccountDTO: VerifyAccountDTO) {
    const user = await this.userRepository.getOne({
      email: verifyAccountDTO.email.trim(),
    });
    if (!user) throw new UnauthorizedException('User is not registered');
    if (user.emailVerified)
      throw new ConflictException('email already verified');
    if (user.otp !== verifyAccountDTO.otp)
      throw new UnauthorizedException('Invalid OTP');
    if (user.otpExpiry! < new Date())
      throw new UnauthorizedException('OTP has expired');
    await this.userRepository.updateOne(
      { email: verifyAccountDTO.email.trim() },
      {
        emailVerified: true,
        status: AccountStatus.ACTIVE,
        $unset: { otp: '', otpExpiry: '' },
      },
    );
  }

  async login(loginDTO: LoginDTO) {
    const user = await this.userRepository.getOne({
      email: loginDTO.email.trim().toLowerCase(),
    });
    const match = await bcrypt.compare(
      loginDTO.password,
      user?.password || ' ',
    );
    if (!user) throw new UnauthorizedException('User is not registered');
    if (user?.status !== AccountStatus.ACTIVE)
      throw new UnauthorizedException('Account is not active');
    if (!match) throw new UnauthorizedException('Invalid password');
    const accessToken = this.jwtService.sign(
      {
        _id: user._id,
        role: user.role,
        email: user.email,
      },
      {
        secret: process.env.ACCESS_JWT_SECRET,
        expiresIn: '15m',
      },
    );
    const refreshToken = this.jwtService.sign(
      {
        _id: user._id,
      },
      {
        secret: process.env.REFRESH_JWT_SECRET,
        expiresIn: '30d',
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.updateOne(
      { _id: user._id },
      {
        refreshToken: hashedRefreshToken,
      },
    );
    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        _id: string;
      }>(refreshToken, {
        secret: process.env.REFRESH_JWT_SECRET,
      });
      const user = await this.userRepository.getOne({
        _id: payload._id,
      });

      if (!user) throw new UnauthorizedException('User not found');
      if (!user.refreshToken)
        throw new UnauthorizedException('Refresh token not found');

      const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isValid) throw new UnauthorizedException('Invalid refresh token');

      const accessToken = this.jwtService.sign(
        {
          _id: user._id,
          role: user.role,
          email: user.email,
        },
        {
          secret: process.env.ACCESS_JWT_SECRET,
          expiresIn: '15m',
        },
      );

      const newRefreshToken = this.jwtService.sign(
        {
          _id: user._id,
        },
        {
          secret: process.env.REFRESH_JWT_SECRET,
          expiresIn: '30d',
        },
      );
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      await this.userRepository.updateOne(
        {
          _id: user._id,
        },
        {
          refreshToken: hashedRefreshToken,
        },
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    const user = await this.userRepository.getOne({
      _id: userId,
    });

    if (!user) throw new NotFoundException('User not found');

    await this.userRepository.updateOne(
      { _id: userId },
      {
        $unset: {
          refreshToken: 1,
        },
      },
    );
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.trim().toLowerCase();
    const user = await this.userRepository.getOne({
      email,
    });

    if (!user) throw new NotFoundException('User not found');

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepository.updateOne(
      { email },
      {
        otp,
        otpExpiry,
      },
    );
    await sendMail({
      to: email,
      subject: 'Password Reset',
      html: `
      <h1>Password Reset</h1>
      <p>Your password reset OTP is:</p>
      <h2>${otp}</h2>
      <p>This OTP expires in 10 minutes.</p>
    `,
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const email = resetPasswordDto.email.trim().toLowerCase();
    const user = await this.userRepository.getOne({
      email,
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.otp) throw new BadRequestException('No OTP found');
    if (user.otp !== resetPasswordDto.otp)
      throw new UnauthorizedException('Invalid OTP');
    if (!user.otpExpiry || user.otpExpiry < new Date())
      throw new UnauthorizedException('OTP has expired');

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.userRepository.updateOne(
      { email },
      {
        password: hashedPassword,
        $unset: {
          otp: 1,
          otpExpiry: 1,
          refreshToken: 1,
        },
      },
    );
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.getOne({ _id: userId });
    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Current password is incorrect');

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      throw new BadRequestException(
        'New password must be different from current password',
      );

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepository.updateOne(
      { _id: userId },
      {
        $set: {
          password: hashedPassword,
        },
        $unset: {
          refreshToken: 1,
        },
      },
    );
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const email = resendOtpDto.email.trim();
    const user = await this.userRepository.getOne({
      email,
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified)
      throw new BadRequestException('Account is already verified');

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await this.userRepository.updateOne(
      { _id: user._id },
      {
        $set: {
          otp,
          otpExpiry,
        },
      },
    );
    await sendMail({
      to: user.email,
      subject: 'Account Verification',
      html: `<h1>your otp is ${otp}</h1>`,
    });
  }

  private readonly googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
  );
  async googleLogin(dto: GoogleLoginDto) {
    const { idToken, role } = dto;

    if (![UserRole.CUSTOMER, UserRole.PROVIDER].includes(role))
      throw new BadRequestException('Invalid role');

    if (!process.env.GOOGLE_CLIENT_ID)
      throw new Error('GOOGLE_CLIENT_ID is not configured');

    let payload;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (!payload?.sub || !payload.email || !payload.email_verified)
      throw new UnauthorizedException(
        'Google account must have a verified email',
      );

    const googleId = payload.sub;
    const email = payload.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    // Check whether this Google account already exists.
    const existingGoogleUser = await this.userRepository.getOne({
      googleId,
    });

    if (existingGoogleUser) {
      if (existingGoogleUser.status !== AccountStatus.ACTIVE)
        throw new UnauthorizedException('Account is not active');

      // Do not change the role of an existing account during login.
      return this.tokenService.issueTokens(existingGoogleUser);
    }

    // Do not automatically link an existing local account by email.
    const existingEmail = await this.userRepository.getOne({ email });

    if (existingEmail)
      throw new ConflictException(
        'An account with this email already exists. Use your existing login method.',
      );

    const existingPhone = await this.userRepository.getOne({ phone });

    if (existingPhone)
      throw new ConflictException('Phone number is already registered');

    // The schema requires a password, so generate a random one.
    const randomPassword = randomBytes(32).toString('hex');

    const registerDto = {
      firstName: payload.given_name?.trim() || 'Google',
      lastName: payload.family_name?.trim() || 'User',
      email,
      phone,
      password: randomPassword,
      confirmPassword: randomPassword,
      role,
    } as RegisterDto;

    // Reuse your existing factory.
    const user =
      role === UserRole.CUSTOMER
        ? await this.authFactoryService.createCustomer(registerDto)
        : await this.authFactoryService.createProvider(registerDto);

    user.googleId = googleId;
    user.authProvider = AuthProvider.GOOGLE;
    user.emailVerified = true;
    user.phoneVerified = false;
    user.status = AccountStatus.ACTIVE;

    // Google verified the email, so email OTP is not required.
    user.otp = undefined;
    user.otpExpiry = undefined;

    // Provider verification remains pending, as set by your factory.
    const createdUser = await this.userRepository.create(user);

    return this.tokenService.issueTokens({
      _id: createdUser._id,
      role: user.role,
      email: user.email,
    });
  }
}
