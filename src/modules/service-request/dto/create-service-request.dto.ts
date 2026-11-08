import { Type } from 'class-transformer';
import {
    IsArray,
    IsInt,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

class LocationDto {
  @IsString()
  @IsNotEmpty()
  readonly type: string;

  @IsArray()
  @IsNumber({}, { each: true })
  readonly coordinates: number[];
}

export class CreateServiceRequestDto {
  @IsMongoId()
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @Min(1)
  aiEstimatedMinPiastres: number;

  @IsInt()
  @Min(1)
  aiEstimatedMaxPiastres: number;

  @IsInt()
  @Min(1)
  customerOfferPiastres: number;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsObject()
  location: LocationDto;
}
