import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { LeaveStatus } from '@prisma/client';

export class LeaveListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(LeaveStatus)
  leaveStatus?: LeaveStatus;
}
