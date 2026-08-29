import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { GuidesService } from './guides.service';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';

@ApiTags('guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Post()
  @RequirePermissions(Permission.GUIDE_CREATE)
  create(@Body() dto: CreateGuideDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.guidesService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.GUIDE_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.guidesService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.GUIDE_VIEW)
  findById(@Param('id') id: string) {
    return this.guidesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.GUIDE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGuideDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.guidesService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.GUIDE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.guidesService.remove(id, toRequestContext(req, userId));
  }
}
