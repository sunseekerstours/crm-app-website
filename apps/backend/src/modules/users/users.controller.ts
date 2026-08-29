import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { PaginationQueryDto } from '@app/common/dto/pagination.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private meta(@Req() req: Request, @CurrentUser('id') userId: string) {
    return {
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).requestId,
    };
  }

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  create(@Body() dto: CreateUserDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.usersService.create(dto, this.meta(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.USER_VIEW)
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_VIEW)
  findById(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.usersService.findById(id, this.meta(req, userId));
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.update(id, dto, this.meta(req, userId));
  }

  @Post(':id/roles')
  @RequirePermissions(Permission.USER_ASSIGN_ROLE)
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.assignRole(id, dto, this.meta(req, userId));
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions(Permission.USER_ASSIGN_ROLE)
  removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.removeRole(id, roleId, this.meta(req, userId));
  }
}
