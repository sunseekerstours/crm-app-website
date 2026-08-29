import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdatePreferenceDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  inApp?: boolean;
}
