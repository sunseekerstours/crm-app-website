import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealListQueryDto } from './dto/deal-list-query.dto';

@ApiTags('deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @RequirePermissions(Permission.DEAL_CREATE)
  create(@Body() dto: CreateDealDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.dealsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.DEAL_VIEW)
  findAll(@Query() query: DealListQueryDto) {
    return this.dealsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      stage: query.stage,
      salespersonId: query.salespersonId,
    });
  }

  @Get('pipeline')
  @RequirePermissions(Permission.DEAL_VIEW)
  pipeline() {
    return this.dealsService.pipelineSummary();
  }

  @Get(':id')
  @RequirePermissions(Permission.DEAL_VIEW)
  findById(@Param('id') id: string) {
    return this.dealsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DEAL_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.dealsService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.DEAL_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.dealsService.remove(id, toRequestContext(req, userId));
  }
}
