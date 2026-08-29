import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  departureId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
