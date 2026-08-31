import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PerformanceRating } from '@prisma/client';

export class CreatePerformanceDto {
  @IsString()
  employeeId!: string;

  @IsDateString()
  reviewDate!: string;

  @IsEnum(PerformanceRating)
  rating!: PerformanceRating;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  score?: number;

  @IsOptional()
  @IsString()
  goals?: string;

  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  improvements?: string;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  reviewedById?: string;
}
