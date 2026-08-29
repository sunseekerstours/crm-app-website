import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { TravelersService } from './travelers.service';
import { CreateTravelerDto } from './dto/create-traveler.dto';
import { UpdateTravelerDto } from './dto/update-traveler.dto';
import { TravelerListQueryDto } from './dto/traveler-list-query.dto';

@ApiTags('travelers')
@Controller('travelers')
export class TravelersController {
  constructor(private readonly travelersService: TravelersService) {}

  @Post()
  @RequirePermissions(Permission.TRAVELER_CREATE)
  create(@Body() dto: CreateTravelerDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.travelersService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.TRAVELER_VIEW)
  findAll(@Query() query: TravelerListQueryDto) {
    return this.travelersService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      nationality: query.nationality,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.TRAVELER_VIEW)
  findById(@Param('id') id: string) {
    return this.travelersService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TRAVELER_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTravelerDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.travelersService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.TRAVELER_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.travelersService.remove(id, toRequestContext(req, userId));
  }
}
