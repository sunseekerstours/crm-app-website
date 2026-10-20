import { IsOptional, IsString, IsNumber } from 'class-validator';

export class TargetSettingsDto {
  @IsOptional()
  leads?: number | string;

  @IsOptional()
  meetings?: number | string;

  @IsOptional()
  proposals?: number | string;

  @IsOptional()
  dealsClosed?: number | string;

  @IsOptional()
  revenueGhc?: number | string;
}
