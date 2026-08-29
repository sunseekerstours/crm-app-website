import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { HotelsService } from './hotels.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Post()
  @RequirePermissions(Permission.HOTEL_CREATE)
  create(@Body() dto: CreateHotelDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.hotelsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.HOTEL_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.hotelsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.HOTEL_VIEW)
  findById(@Param('id') id: string) {
    return this.hotelsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.HOTEL_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.hotelsService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.HOTEL_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.hotelsService.remove(id, toRequestContext(req, userId));
  }
}
