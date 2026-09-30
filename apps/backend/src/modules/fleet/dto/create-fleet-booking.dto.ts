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
}
