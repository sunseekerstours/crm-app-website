import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class TaskListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assignedToId?: string;

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
  @IsDateString()
  dueBefore?: string;
}
