import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadListQueryDto } from './dto/lead-list-query.dto';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @RequirePermissions(Permission.LEAD_CREATE)
  create(@Body() dto: CreateLeadDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.leadsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.LEAD_VIEW)
  findAll(@Query() query: LeadListQueryDto) {
    return this.leadsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      stage: query.stage,
      source: query.source,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.LEAD_VIEW)
  findById(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.LEAD_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.update(id, dto, toRequestContext(req, userId));
  }

  @Post(':id/convert')
  @RequirePermissions(Permission.LEAD_UPDATE)
  convert(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.leadsService.convert(id, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.LEAD_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.leadsService.remove(id, toRequestContext(req, userId));
  }
}
