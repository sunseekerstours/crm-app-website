import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { FleetService } from './fleet.service';
import { CreateFleetBookingDto } from './dto/create-fleet-booking.dto';
import { UpdateFleetBookingDto } from './dto/update-fleet-booking.dto';

@ApiTags('fleet')
@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post()
  @RequirePermissions(Permission.BOOKING_CREATE)
  create(@Body() dto: CreateFleetBookingDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.fleetService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.BOOKING_VIEW)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '200',
    @Query('vehicleId') vehicleId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.fleetService.findAll({
      page:      parseInt(page, 10) || 1,
      limit:     parseInt(limit, 10) || 200,
      vehicleId,
      from,
      to,
    });
  }

  @Get('summary')
  @RequirePermissions(Permission.BOOKING_VIEW)
  getSummary(@Query('year') year?: string, @Query('month') month?: string) {
    const y = parseInt(year || '', 10) || new Date().getFullYear();
    const m = parseInt(month || '', 10) || (new Date().getMonth() + 1);
    return this.fleetService.getSummary(y, m);
  }

  @Get(':id')
  @RequirePermissions(Permission.BOOKING_VIEW)
  findById(@Param('id') id: string) {
    return this.fleetService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BOOKING_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateFleetBookingDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.fleetService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.BOOKING_CANCEL)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.fleetService.remove(id, toRequestContext(req, userId));
  }
}
