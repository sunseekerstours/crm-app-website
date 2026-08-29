import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingListQueryDto } from './dto/booking-list-query.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @RequirePermissions(Permission.BOOKING_CREATE)
  create(@Body() dto: CreateBookingDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.bookingsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.BOOKING_VIEW)
  findAll(@Query() query: BookingListQueryDto) {
    return this.bookingsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      customerId: query.customerId,
      departureId: query.departureId,
      status: query.status,
      from: query.from,
      to: query.to,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.BOOKING_VIEW)
  findById(@Param('id') id: string) {
    return this.bookingsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.BOOKING_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.update(id, dto, toRequestContext(req, userId));
  }

  @Post(':id/confirm')
  @RequirePermissions(Permission.BOOKING_UPDATE)
  confirm(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.bookingsService.confirm(id, toRequestContext(req, userId));
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.BOOKING_CANCEL)
  cancel(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.bookingsService.cancel(id, toRequestContext(req, userId));
  }

  @Post(':id/travelers/:travelerId')
  @RequirePermissions(Permission.BOOKING_UPDATE)
  addTraveler(
    @Param('id') id: string,
    @Param('travelerId') travelerId: string,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.addTraveler(id, travelerId, toRequestContext(req, userId));
  }

  @Delete(':id/travelers/:travelerId')
  @RequirePermissions(Permission.BOOKING_UPDATE)
  removeTraveler(
    @Param('id') id: string,
    @Param('travelerId') travelerId: string,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.removeTraveler(id, travelerId, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.BOOKING_UPDATE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.bookingsService.remove(id, toRequestContext(req, userId));
  }
}
