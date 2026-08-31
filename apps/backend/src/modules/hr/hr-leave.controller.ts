import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { HrLeaveService } from './hr-leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { LeaveListQueryDto } from './dto/leave-list-query.dto';

@ApiTags('hr-leave')
@Controller('leave')
export class HrLeaveController {
  constructor(private readonly leaveService: HrLeaveService) {}

  @Post()
  @RequirePermissions(Permission.LEAVE_CREATE)
  create(@Body() dto: CreateLeaveDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.leaveService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.LEAVE_VIEW)
  findAll(@Query() query: LeaveListQueryDto) {
    return this.leaveService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      employeeId: query.employeeId,
      status: query.leaveStatus,
    });
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.LEAVE_APPROVE)
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.leaveService.approve(id, dto, toRequestContext(req, userId));
  }

  @Get(':id')
  @RequirePermissions(Permission.LEAVE_VIEW)
  findById(@Param('id') id: string) {
    return this.leaveService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.LEAVE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.leaveService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.LEAVE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.leaveService.remove(id, toRequestContext(req, userId));
  }
}
