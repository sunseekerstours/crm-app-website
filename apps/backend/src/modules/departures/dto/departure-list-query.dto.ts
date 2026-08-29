import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { DepartureStatus } from '@prisma/client';

export class DepartureListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsEnum(DepartureStatus)
  status?: DepartureStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
