import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions(Permission.PAYMENT_CREATE)
  create(@Body() dto: CreatePaymentDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.paymentsService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.PAYMENT_VIEW)
  findAll(@Query() query: PaymentListQueryDto) {
    return this.paymentsService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      bookingId: query.bookingId,
      invoiceId: query.invoiceId,
      customerId: query.customerId,
      status: query.status,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.PAYMENT_VIEW)
  findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Post(':id/refund')
  @RequirePermissions(Permission.PAYMENT_REFUND)
  refund(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.paymentsService.refund(id, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.PAYMENT_VIEW)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.paymentsService.remove(id, toRequestContext(req, userId));
  }
}
