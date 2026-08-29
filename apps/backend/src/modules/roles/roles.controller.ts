import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { PaginationQueryDto } from '@app/common/dto/pagination.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(Permission.ROLE_VIEW)
  findAll(@Query() query: PaginationQueryDto) {
    return this.rolesService.findAll({ page: query.page ?? 1, limit: query.limit ?? 50 });
  }

  @Get(':id')
  @RequirePermissions(Permission.ROLE_VIEW)
  findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }
}
