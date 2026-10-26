import { IsByteLength, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyAccountDTO {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
