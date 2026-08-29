import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceListQueryDto } from './dto/invoice-list-query.dto';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermissions(Permission.INVOICE_CREATE)
  create(@Body() dto: CreateInvoiceDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.invoicesService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.INVOICE_VIEW)
  findAll(@Query() query: InvoiceListQueryDto) {
    return this.invoicesService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      customerId: query.customerId,
      bookingId: query.bookingId,
      status: query.status,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.INVOICE_VIEW)
  findById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.INVOICE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicesService.update(id, dto, toRequestContext(req, userId));
  }

  @Post(':id/issue')
  @RequirePermissions(Permission.INVOICE_UPDATE)
  issue(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.invoicesService.issue(id, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.INVOICE_UPDATE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.invoicesService.remove(id, toRequestContext(req, userId));
  }
}
