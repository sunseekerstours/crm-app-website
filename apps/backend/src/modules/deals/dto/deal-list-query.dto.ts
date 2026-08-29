import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { DealStage } from '@prisma/client';

export class DealListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @IsOptional()
  @IsString()
  salespersonId?: string;
}
