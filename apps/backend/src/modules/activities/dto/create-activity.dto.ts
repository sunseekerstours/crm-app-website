import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type!: ActivityType;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
