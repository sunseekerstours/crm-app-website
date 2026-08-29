import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @RequirePermissions(Permission.DRIVER_CREATE)
  create(@Body() dto: CreateDriverDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.driversService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.DRIVER_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.driversService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.DRIVER_VIEW)
  findById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DRIVER_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.driversService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.DRIVER_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.driversService.remove(id, toRequestContext(req, userId));
  }
}
