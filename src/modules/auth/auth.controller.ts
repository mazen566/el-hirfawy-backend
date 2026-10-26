import { Body, Controller, Patch, Post } from '@nestjs/common';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { User } from '../../common/decorators/user.decorator.js';
import { UserRole } from '../../common/index.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/changePassword.dto.js';
import { ForgotPasswordDto } from './dto/forgotPassword.dto.js';
import { LoginDTO } from './dto/login.dto.js';
import { GoogleLoginDto } from './dto/loginGoogle.dto.js';
import { RefreshTokenDto } from './dto/refreshToken.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendOtpDto } from './dto/resendOtp.dto.js';
import { ResetPasswordDto } from './dto/resetPassword.dto.js';
import { VerifyAccountDTO } from './dto/verifyAccount.dto.js';
import { AuthFactoryService } from './factory/index.js';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authFactoryService: AuthFactoryService,
  ) {}

  @Public()
  @Post('register')
  async create(@Body() registerDto: RegisterDto) {
    if (registerDto.role === UserRole.CUSTOMER) {
      const customer =
        await this.authFactoryService.createCustomer(registerDto);
      const createdCustomer = await this.authService.register(customer);
      return {
        message: 'Customer registered successfully',
        success: true,
        data: createdCustomer,
      };
    } else if (registerDto.role === UserRole.PROVIDER) {
      const provider =
        await this.authFactoryService.createProvider(registerDto);
      const createdProvider = await this.authService.register(provider);
      return {
        message: 'Provider registered successfully',
        success: true,
        data: createdProvider,
      };
    }
  }

  @Public()
  @Post('verify-account')
  async verifyAccount(@Body() verifyAccountDTO: VerifyAccountDTO) {
    await this.authService.verifyAccount(verifyAccountDTO);
    return {
      message: 'Email verified successfully',
      success: true,
    };
  }

  @Post('login')
  async login(@Body() loginDTO: LoginDTO) {
    const tokens = await this.authService.login(loginDTO);
    return {
      message: 'Login successful',
      success: true,
      data: {
        tokens,
      },
    };
  }

  @Public()
  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(
      refreshTokenDto.refreshToken,
    );

    return {
      message: 'Token refreshed successfully',
      success: true,
      data: tokens,
    };
  }

  @Post('logout')
  @Auth()
  async logout(@User('_id') userId: any) {
    await this.authService.logout(userId);
    return {
      message: 'Logout successful',
      success: true,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto);
    return {
      message: 'Password reset OTP sent successfully',
      success: true,
    };
  }

  @Patch('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return {
      message: 'Password reset successfully',
      success: true,
    };
  }

  @Patch('change-password')
  @Auth()
  async changePassword(
    @User('_id') userId: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, changePasswordDto);
    return {
      message: 'Password changed successfully',
      success: true,
    };
  }

  @Public()
  @Post('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    await this.authService.resendOtp(resendOtpDto);
    return {
      message: 'OTP sent successfully',
      success: true,
    };
  }

  @Public()
  @Post('loginWithGoogle')
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    const tokens = await this.authService.googleLogin(googleLoginDto);

    return {
      message: 'Google login successful',
      success: true,
      data: tokens,
    };
  }
}
