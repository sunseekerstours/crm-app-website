import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTourPricingDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  persons?: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
