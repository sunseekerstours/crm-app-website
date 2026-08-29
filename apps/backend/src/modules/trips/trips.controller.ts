import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { TripsService } from './trips.service';
import { CreateTripAssignmentDto } from './dto/create-trip-assignment.dto';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post(':departureId/assignments')
  @RequirePermissions(Permission.TRIP_CONFIGURE)
  createAssignment(
    @Param('departureId') departureId: string,
    @Body() dto: CreateTripAssignmentDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.tripsService.createAssignment(departureId, dto, toRequestContext(req, userId));
  }

  @Get(':departureId/assignments')
  @RequirePermissions(Permission.TRIP_VIEW)
  findAssignments(@Param('departureId') departureId: string) {
    return this.tripsService.findAllAssignments(departureId);
  }

  @Patch('assignments/:id')
  @RequirePermissions(Permission.TRIP_CONFIGURE)
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateTripAssignmentDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.tripsService.updateAssignment(id, dto, toRequestContext(req, userId));
  }

  @Delete('assignments/:id')
  @RequirePermissions(Permission.TRIP_CONFIGURE)
  removeAssignment(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.tripsService.removeAssignment(id, toRequestContext(req, userId));
  }

  @Get(':departureId/board')
  @RequirePermissions(Permission.TRIP_VIEW)
  getBoard(@Param('departureId') departureId: string) {
    return this.tripsService.getBoard(departureId);
  }
}
