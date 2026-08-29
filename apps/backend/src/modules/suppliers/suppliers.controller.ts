import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequirePermissions(Permission.SUPPLIER_CREATE)
  create(@Body() dto: CreateSupplierDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.suppliersService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.SUPPLIER_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.suppliersService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      type: query.type,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.SUPPLIER_VIEW)
  findById(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SUPPLIER_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.suppliersService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.SUPPLIER_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.suppliersService.remove(id, toRequestContext(req, userId));
  }
}
