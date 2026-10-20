import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { SaveWeeklyReportDto } from './dto/save-weekly-report.dto';
import { WeeklyReportQueryDto } from './dto/weekly-report-query.dto';
import { TargetSettingsDto } from './dto/target-settings.dto';
import { WeeklyReportStatus } from '@prisma/client';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Preview and auto-populate live weekly sales metrics
   */
  @Get('weekly-sales/preview')
  @RequirePermissions(Permission.REPORT_VIEW)
  previewWeeklyReport(
    @Query() query: WeeklyReportQueryDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.previewWeeklyReport(query, toRequestContext(req, userId));
  }

  /**
   * Save or update a weekly sales report
   */
  @Post('weekly-sales')
  @RequirePermissions(Permission.REPORT_CREATE)
  saveWeeklyReport(
    @Body() dto: SaveWeeklyReportDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.saveWeeklyReport(dto, toRequestContext(req, userId));
  }

  /**
   * List submitted and draft weekly sales reports
   */
  @Get('weekly-sales')
  @RequirePermissions(Permission.REPORT_VIEW)
  findAll(
    @Query('userId') queryUserId?: string,
    @Query('status') status?: WeeklyReportStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Req() req?: Request,
    @CurrentUser('id') userId?: string,
  ) {
    return this.reportsService.findAll(
      { userId: queryUserId, status, page, limit },
      toRequestContext(req!, userId),
    );
  }

  /**
   * Get single report by ID
   */
  @Get('weekly-sales/:id')
  @RequirePermissions(Permission.REPORT_VIEW)
  findById(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  /**
   * Manager sign-off on a weekly report
   */
  @Post('weekly-sales/:id/sign-off')
  @RequirePermissions(Permission.REPORT_REVIEW)
  signOff(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.signOff(id, body.notes || '', toRequestContext(req, userId));
  }

  /**
   * Get current default target settings (flexible)
   */
  @Get('target-settings')
  @RequirePermissions(Permission.REPORT_VIEW)
  getTargetSettings() {
    return this.reportsService.getTargetSettings();
  }

  /**
   * Update ongoing target settings (changeable over time)
   */
  @Put('target-settings')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  updateTargetSettings(
    @Body() dto: TargetSettingsDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.updateTargetSettings(dto, toRequestContext(req, userId));
  }
}
