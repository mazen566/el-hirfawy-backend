import { IsNotEmpty, IsString, MinLength } from 'class-validator';

import { Match } from '../../../common/decorators/match.decorator.js';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Match('newPassword', {
    message: 'Confirm password must match new password',
  })
  confirmPassword: string;
}
