import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTourDayDto {
  @IsInt()
  dayNumber!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meals?: string[];

  @IsOptional()
  @IsString()
  accommodation?: string;

  @IsOptional()
  @IsString()
  destinationId?: string;
}
