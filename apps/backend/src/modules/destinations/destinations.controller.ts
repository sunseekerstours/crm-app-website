import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { DestinationsService } from './destinations.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { DestinationListQueryDto } from './dto/destination-list-query.dto';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Post()
  @RequirePermissions(Permission.DESTINATION_CREATE)
  create(
    @Body() dto: CreateDestinationDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.destinationsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.DESTINATION_VIEW)
  findAll(@Query() query: DestinationListQueryDto) {
    return this.destinationsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      country: query.country,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.DESTINATION_VIEW)
  findById(@Param('id') id: string) {
    return this.destinationsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DESTINATION_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDestinationDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.destinationsService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.DESTINATION_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.destinationsService.remove(id, toRequestContext(req, userId));
  }
}
