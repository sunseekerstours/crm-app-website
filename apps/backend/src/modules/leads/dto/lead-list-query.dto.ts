import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { LeadStage, LeadSource } from '@prisma/client';

export class LeadListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;
}
