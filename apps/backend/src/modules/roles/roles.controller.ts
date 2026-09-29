import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { PaginationQueryDto } from '@app/common/dto/pagination.dto';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private meta(@Req() req: Request, @CurrentUser('id') userId: string) {
    return {
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).requestId,
    };
  }

  @Get()
  @RequirePermissions(Permission.ROLE_VIEW)
  findAll(@Query() query: PaginationQueryDto) {
    return this.rolesService.findAll({ page: query.page ?? 1, limit: query.limit ?? 50 });
  }

  /** Flat permission catalog used to build the admin permission matrix. */
  @Get('permissions')
  @RequirePermissions(Permission.PERMISSION_VIEW)
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Get(':id')
  @RequirePermissions(Permission.ROLE_VIEW)
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.ROLE_CREATE)
  create(@Body() dto: CreateRoleDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.rolesService.create(dto, this.meta(req, userId));
  }

  @Patch(':id')
  @RequirePermissions(Permission.ROLE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.rolesService.update(id, dto, this.meta(req, userId));
  }

  @Put(':id/permissions')
  @RequirePermissions(Permission.ROLE_UPDATE)
  setPermissions(
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.rolesService.setPermissions(id, dto, this.meta(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.ROLE_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.rolesService.remove(id, this.meta(req, userId));
  }
}
