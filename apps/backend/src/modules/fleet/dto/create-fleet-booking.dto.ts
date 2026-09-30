import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFleetBookingDto {
  @IsString()
  company!: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  departTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  paxCount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  ratePerDay?: number;

  @IsOptional()
  totalAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsOptional()
  @IsString()
  quoteNumber?: string;

  @IsOptional()
  createInvoice?: boolean;

  @IsOptional()
  createQuote?: boolean;

  @IsOptional()
  allowOverlap?: boolean;
}
