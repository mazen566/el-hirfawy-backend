import { IsByteLength, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyAccountDTO {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
