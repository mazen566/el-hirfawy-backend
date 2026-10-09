import { IsString, MinLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator.js';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @Match('newPassword', {
    message: 'Passwords do not match',
  })
  confirmPassword: string;
}
