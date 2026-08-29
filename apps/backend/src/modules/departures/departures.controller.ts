import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { DeparturesService } from './departures.service';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';
import { CreateDeparturePricingDto } from './dto/create-departure-pricing.dto';
import { DepartureListQueryDto } from './dto/departure-list-query.dto';

@ApiTags('departures')
@Controller('departures')
export class DeparturesController {
  constructor(private readonly departuresService: DeparturesService) {}

  @Post()
  @RequirePermissions(Permission.DEPARTURE_CREATE)
  create(@Body() dto: CreateDepartureDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.departuresService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.DEPARTURE_VIEW)
  findAll(@Query() query: DepartureListQueryDto) {
    return this.departuresService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      tourId: query.tourId,
      status: query.status,
      from: query.from,
      to: query.to,
    });
  }

  @Get(':id/availability')
  @RequirePermissions(Permission.DEPARTURE_VIEW)
  availability(@Param('id') id: string) {
    return this.departuresService.availability(id);
  }

  @Post(':id/pricing')
  @RequirePermissions(Permission.DEPARTURE_UPDATE)
  addPricing(
    @Param('id') id: string,
    @Body() dto: CreateDeparturePricingDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.departuresService.addPricing(id, dto, toRequestContext(req, userId));
  }

  @Patch(':id/pricing/:pricingId')
  @RequirePermissions(Permission.DEPARTURE_UPDATE)
  updatePricing(
    @Param('id') id: string,
    @Param('pricingId') pricingId: string,
    @Body() dto: CreateDeparturePricingDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.departuresService.updatePricing(id, pricingId, dto, toRequestContext(req, userId));
  }

  @Delete(':id/pricing/:pricingId')
  @RequirePermissions(Permission.DEPARTURE_UPDATE)
  removePricing(
    @Param('id') id: string,
    @Param('pricingId') pricingId: string,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.departuresService.removePricing(id, pricingId, toRequestContext(req, userId));
  }

  @Get(':id')
  @RequirePermissions(Permission.DEPARTURE_VIEW)
  findById(@Param('id') id: string) {
    return this.departuresService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DEPARTURE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartureDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.departuresService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.DEPARTURE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.departuresService.remove(id, toRequestContext(req, userId));
  }
}
