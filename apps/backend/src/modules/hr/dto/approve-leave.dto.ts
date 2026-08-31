import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class ApproveLeaveDto {
  @IsEnum(LeaveStatus)
  status!: LeaveStatus;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
