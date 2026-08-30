import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { ContentService } from './content.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageListQueryDto } from './dto/page-list-query.dto';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';

@ApiTags('content')
@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ---- Pages ----

  @Post('pages')
  @RequirePermissions(Permission.PAGE_CREATE)
  createPage(@Body() dto: CreatePageDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.contentService.createPage(dto, toRequestContext(req, userId));
  }

  @Get('pages')
  @RequirePermissions(Permission.PAGE_VIEW)
  findPages(@Query() query: PageListQueryDto) {
    return this.contentService.findPages({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      status: query.status,
    });
  }

  @Get('pages/:id')
  @RequirePermissions(Permission.PAGE_VIEW)
  findPage(@Param('id') id: string) {
    return this.contentService.findPageById(id);
  }

  @Patch('pages/:id')
  @RequirePermissions(Permission.PAGE_UPDATE)
  updatePage(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentService.updatePage(id, dto, toRequestContext(req, userId));
  }

  @Delete('pages/:id')
  @RequirePermissions(Permission.PAGE_DELETE)
  removePage(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.contentService.removePage(id, toRequestContext(req, userId));
  }

  // ---- Site settings ----

  @Get('site-settings')
  @RequirePermissions(Permission.SITE_SETTING_VIEW)
  listSettings() {
    return this.contentService.listSiteSettings();
  }

  @Patch('site-settings/:key')
  @RequirePermissions(Permission.SITE_SETTING_UPDATE)
  updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSiteSettingDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentService.updateSiteSetting(key, dto, toRequestContext(req, userId));
  }
}
