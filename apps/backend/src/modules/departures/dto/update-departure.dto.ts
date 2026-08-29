import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { DepartureStatus } from '@prisma/client';

export class UpdateDepartureDto {
  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
}
