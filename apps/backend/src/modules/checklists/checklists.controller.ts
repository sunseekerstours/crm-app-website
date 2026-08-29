import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@ApiTags('checklists')
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  @RequirePermissions(Permission.CHECKLIST_CREATE)
  create(
    @Body() dto: CreateChecklistItemDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.checklistsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.CHECKLIST_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.checklistsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      departureId: query.departureId,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.CHECKLIST_VIEW)
  findById(@Param('id') id: string) {
    return this.checklistsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CHECKLIST_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistItemDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.checklistsService.update(id, dto, toRequestContext(req, userId));
  }

  @Post(':id/complete')
  @RequirePermissions(Permission.CHECKLIST_COMPLETE)
  complete(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.checklistsService.toggleComplete(id, true, toRequestContext(req, userId));
  }

  @Post(':id/reopen')
  @RequirePermissions(Permission.CHECKLIST_COMPLETE)
  reopen(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.checklistsService.toggleComplete(id, false, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.CHECKLIST_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.checklistsService.remove(id, toRequestContext(req, userId));
  }
}
