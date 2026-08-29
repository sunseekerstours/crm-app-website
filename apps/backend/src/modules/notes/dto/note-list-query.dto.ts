import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';

export class NoteListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  dealId?: string;
}
