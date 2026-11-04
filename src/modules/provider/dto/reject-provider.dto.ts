import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
