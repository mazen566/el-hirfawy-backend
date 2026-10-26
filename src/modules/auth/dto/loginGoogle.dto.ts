
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { UserRole } from '../../../common/index.js';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsEnum([UserRole.CUSTOMER, UserRole.PROVIDER])
  role: UserRole;

  @IsString()
  // @Matches(/^\+?[1-9]\d{7,14}$/)
  phone: string;
}
