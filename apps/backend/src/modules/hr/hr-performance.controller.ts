import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { HrPerformanceService } from './hr-performance.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';
import { PerformanceListQueryDto } from './dto/performance-list-query.dto';

@ApiTags('hr-performance')
@Controller('performance')
export class HrPerformanceController {
  constructor(private readonly performanceService: HrPerformanceService) {}

  @Post()
  @RequirePermissions(Permission.PERFORMANCE_CREATE)
  create(
    @Body() dto: CreatePerformanceDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.performanceService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.PERFORMANCE_VIEW)
  findAll(@Query() query: PerformanceListQueryDto) {
    return this.performanceService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      employeeId: query.employeeId,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.PERFORMANCE_VIEW)
  findById(@Param('id') id: string) {
    return this.performanceService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PERFORMANCE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePerformanceDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.performanceService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.PERFORMANCE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.performanceService.remove(id, toRequestContext(req, userId));
  }
}
