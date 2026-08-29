import { IsBoolean, IsOptional } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';

export class NotificationListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}
