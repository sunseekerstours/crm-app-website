import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { WeeklyReportStatus } from '@prisma/client';

export class SaveWeeklyReportDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  weekStartDate: string;

  @IsString()
  weekEndDate: string;

  @IsOptional()
  @IsEnum(WeeklyReportStatus)
  status?: WeeklyReportStatus;

  @IsOptional()
  @IsString()
  managerName?: string;

  @IsOptional()
  activitySummary?: Record<string, any>;

  @IsOptional()
  @IsArray()
  kpis?: any[];

  @IsOptional()
  @IsArray()
  pipelineDeals?: any[];

  @IsOptional()
  @IsArray()
  wins?: string[];

  @IsOptional()
  @IsArray()
  blockers?: string[];

  @IsOptional()
  @IsString()
  keyLearning?: string;

  @IsOptional()
  @IsArray()
  commitments?: any[];

  @IsOptional()
  @IsString()
  overallPerformance?: string;

  @IsOptional()
  @IsString()
  keyWinHighlight?: string;

  @IsOptional()
  @IsString()
  supportNeeded?: string;

  @IsOptional()
  @IsNumber()
  projectedRevenueGhc?: number;

  @IsOptional()
  @IsString()
  onTrackStatus?: string;

  @IsOptional()
  @IsString()
  repSignedAt?: string;

  @IsOptional()
  @IsString()
  managerNotes?: string;
}
