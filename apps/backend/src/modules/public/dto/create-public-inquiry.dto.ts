import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePublicInquiryDto {
  @ApiProperty({ description: 'Customer full name or first name' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ description: 'Customer email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    description: 'Type of service (HOTEL, FLIGHT, VEHICLE, TOUR, GENERAL)',
    example: 'HOTEL',
  })
  @IsString()
  @IsNotEmpty()
  serviceType!: string;

  @ApiPropertyOptional({ description: 'Destination or trip title' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: 'Interested specific tour slug or name' })
  @IsOptional()
  @IsString()
  interestedTour?: string;

  @ApiPropertyOptional({ description: 'Check-in date or departure date' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Check-out date or return date' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Room type, vehicle category, or flight class' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Number of guests or passengers' })
  @IsOptional()
  @IsString()
  guests?: string;

  @ApiPropertyOptional({ description: 'Pickup location or departure airport' })
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @ApiPropertyOptional({ description: 'Dropoff location or destination airport' })
  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @ApiPropertyOptional({ description: 'Customer message or special requirements' })
  @IsOptional()
  @IsString()
  message?: string;
}
