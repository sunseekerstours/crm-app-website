import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { TourStatus } from '@prisma/client';

export class TourListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @IsOptional()
  @IsString()
  destinationId?: string;
}
