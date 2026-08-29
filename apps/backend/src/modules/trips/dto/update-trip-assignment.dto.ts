import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTripAssignmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  dayNumber?: number;

  @IsOptional()
  @IsString()
  guideId?: string;

  @IsOptional()
  @IsString()
  hotelId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
