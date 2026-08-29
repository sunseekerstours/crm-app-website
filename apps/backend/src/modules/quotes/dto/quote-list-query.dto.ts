import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { QuoteStatus } from '@prisma/client';

export class QuoteListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;
}
