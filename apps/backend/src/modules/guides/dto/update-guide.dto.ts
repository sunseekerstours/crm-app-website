import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateGuideDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString({ each: true })
  specialities?: string[];

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
