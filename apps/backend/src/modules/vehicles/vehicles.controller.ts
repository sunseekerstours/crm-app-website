import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @RequirePermissions(Permission.VEHICLE_CREATE)
  create(@Body() dto: CreateVehicleDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.vehiclesService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.VEHICLE_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.vehiclesService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      type: query.type,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.VEHICLE_VIEW)
  findById(@Param('id') id: string) {
    return this.vehiclesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.VEHICLE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehiclesService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.VEHICLE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.vehiclesService.remove(id, toRequestContext(req, userId));
  }
}
