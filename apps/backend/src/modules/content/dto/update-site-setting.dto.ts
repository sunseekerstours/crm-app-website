import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSiteSettingDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsObject()
  valueJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isPublic?: boolean;
}
