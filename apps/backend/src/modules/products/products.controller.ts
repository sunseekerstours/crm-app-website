import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions(Permission.PRODUCT_CREATE)
  create(@Body() dto: CreateProductDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.productsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.PRODUCT_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.productsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 50,
      search: query.search,
      category: query.category,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCT_VIEW)
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.PRODUCT_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.productsService.remove(id, toRequestContext(req, userId));
  }
}
