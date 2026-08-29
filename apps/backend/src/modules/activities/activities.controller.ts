import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ActivityListQueryDto } from './dto/activity-list-query.dto';

@ApiTags('activities')
@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('customers/:id/activities')
  @RequirePermissions(Permission.ACTIVITY_CREATE)
  createForCustomer(
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.create(
      dto,
      { entityType: 'CUSTOMER', entityId: id },
      toRequestContext(req, userId),
    );
  }

  @Post('leads/:id/activities')
  @RequirePermissions(Permission.ACTIVITY_CREATE)
  createForLead(
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.create(
      dto,
      { entityType: 'LEAD', entityId: id },
      toRequestContext(req, userId),
    );
  }

  @Post('deals/:id/activities')
  @RequirePermissions(Permission.ACTIVITY_CREATE)
  createForDeal(
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.create(
      dto,
      { entityType: 'DEAL', entityId: id },
      toRequestContext(req, userId),
    );
  }

  @Get('activities')
  @RequirePermissions(Permission.ACTIVITY_VIEW)
  findAll(@Query() query: ActivityListQueryDto) {
    return this.activitiesService.findAll(query);
  }

  @Delete('activities/:id')
  @RequirePermissions(Permission.ACTIVITY_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.activitiesService.remove(id, toRequestContext(req, userId));
  }
}
