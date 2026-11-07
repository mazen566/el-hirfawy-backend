import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(200)
  description?: string;
}
