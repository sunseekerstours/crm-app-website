import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TourStatus } from '@prisma/client';
import { CreateTourDayDto } from './create-tour-day.dto';

export class CreateTourDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationDays?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minPax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxPax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  destinationIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTourDayDto)
  days?: CreateTourDayDto[];
}
