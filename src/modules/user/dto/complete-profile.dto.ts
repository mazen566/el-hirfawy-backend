import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  governorate: string;

  @IsString()
  @IsNotEmpty()
  district: string;
}

export class CompleteProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  experience?: number;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
