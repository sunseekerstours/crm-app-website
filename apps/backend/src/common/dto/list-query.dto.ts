import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';

export class ListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  departureId?: string;
}
