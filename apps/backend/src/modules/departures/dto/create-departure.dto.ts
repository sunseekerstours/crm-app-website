import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DepartureStatus } from '@prisma/client';
import { CreateDeparturePricingDto } from './create-departure-pricing.dto';

export class CreateDepartureDto {
  @IsString()
  tourId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsEnum(DepartureStatus)
  status?: DepartureStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minPax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxPax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeparturePricingDto)
  pricing?: CreateDeparturePricingDto[];
}
