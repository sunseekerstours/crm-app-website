import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { ToursService } from './tours.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourListQueryDto } from './dto/tour-list-query.dto';

@ApiTags('tours')
@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Post()
  @RequirePermissions(Permission.TOUR_CREATE)
  create(@Body() dto: CreateTourDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.toursService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.TOUR_VIEW)
  findAll(@Query() query: TourListQueryDto) {
    return this.toursService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      status: query.status,
      destinationId: query.destinationId,
    });
  }

  @Get(':id/availability')
  @RequirePermissions(Permission.TOUR_VIEW)
  availability(@Param('id') id: string) {
    return this.toursService.availability(id);
  }

  @Post(':id/publish')
  @RequirePermissions(Permission.TOUR_PUBLISH)
  publish(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.toursService.publish(id, toRequestContext(req, userId));
  }

  @Get(':id')
  @RequirePermissions(Permission.TOUR_VIEW)
  findById(@Param('id') id: string) {
    return this.toursService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TOUR_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTourDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.toursService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.TOUR_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.toursService.remove(id, toRequestContext(req, userId));
  }
}
