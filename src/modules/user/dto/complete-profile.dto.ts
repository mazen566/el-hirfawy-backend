import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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

  @IsString()
  @IsNotEmpty()
  street: string;
}

export class WorkingHoursDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  from: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  to: string;
}

export class CompleteProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  service?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  experience?: string;

  @ValidateNested()
  @Type(() => WorkingHoursDto)
  @IsOptional()
  workingHours?: WorkingHoursDto;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
