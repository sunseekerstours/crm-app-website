import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { QuoteStatus } from '@prisma/client';

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  departureId?: string;

  @IsOptional()
  @IsString()
  tourName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;
}
