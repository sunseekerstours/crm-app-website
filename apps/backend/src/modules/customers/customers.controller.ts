import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions(Permission.CUSTOMER_CREATE)
  create(@Body() dto: CreateCustomerDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.customersService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.customersService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      status: query.status,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CUSTOMER_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.CUSTOMER_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.customersService.remove(id, toRequestContext(req, userId));
  }
}
