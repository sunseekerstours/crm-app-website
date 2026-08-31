import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';

export class PerformanceListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;
}
