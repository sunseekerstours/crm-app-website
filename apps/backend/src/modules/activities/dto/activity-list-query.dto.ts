import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { ActivityType } from '@prisma/client';

export class ActivityListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  dealId?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;
}
