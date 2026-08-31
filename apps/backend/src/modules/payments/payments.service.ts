import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { InvoicesService } from '@app/modules/invoices/invoices.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Prisma, AuditableAction, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface PaymentListParams {
  page: number;
  limit: number;
  search?: string;
  bookingId?: string;
  invoiceId?: string;
  customerId?: string;
  status?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async create(dto: CreatePaymentDto, ctx: RequestContext) {
    let customerId = dto.customerId;

    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
      if (!invoice)
        throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Invoice not found');
      if (invoice.status === 'CANCELLED') {
        throw new ApiConflictException(
          ErrorCode.BAD_REQUEST,
          'Cannot record payment on a cancelled invoice',
        );
      }
      if (!customerId && invoice.customerId) customerId = invoice.customerId;
    }
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
      if (!booking)
        throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');
      if (!customerId && booking.customerId) customerId = booking.customerId;
    }

    const receiptNumber = dto.receiptNumber || (await this.nextNumber('RCT'));

    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber: await this.nextNumber('PAY'),
        receiptNumber,
        bookingId: dto.bookingId,
        invoiceId: dto.invoiceId,
        customerId,
        dealId: dto.dealId,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        method: dto.method ?? PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        reference: dto.reference,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        notes: dto.notes,
        recordedById: ctx.userId,
      },
      include: {
        customer: true,
        deal: true,
        booking: { select: { id: true, bookingNumber: true, tourName: true } },
        invoice: { select: { id: true, invoiceNumber: true, amount: true, amountPaid: true } },
      },
    });

    if (dto.invoiceId) {
      await this.invoicesService.recomputeStatus(dto.invoiceId);
    }

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PAYMENT_CREATED,
      entityType: 'Payment',
      entityId: payment.id,
      after: {
        paymentNumber: payment.paymentNumber,
        receiptNumber: payment.receiptNumber,
        amount: payment.amount?.toString(),
        invoiceId: dto.invoiceId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return payment;
  }

  async findAll(params: PaymentListParams) {
    const where: Prisma.PaymentWhereInput = {};
    if (params.bookingId) where.bookingId = params.bookingId;
    if (params.invoiceId) where.invoiceId = params.invoiceId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.status) where.status = params.status as PaymentStatus;
    if (params.search) {
      where.OR = [
        { paymentNumber: { contains: params.search, mode: 'insensitive' } },
        { receiptNumber: { contains: params.search, mode: 'insensitive' } },
        { reference: { contains: params.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          deal: true,
          booking: { select: { id: true, bookingNumber: true, tourName: true } },
          invoice: { select: { id: true, invoiceNumber: true, amount: true, amountPaid: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      paginated: true as const,
    };
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        deal: true,
        booking: { select: { id: true, bookingNumber: true, tourName: true, customer: true } },
        invoice: { select: { id: true, invoiceNumber: true, amount: true, amountPaid: true, customer: true } },
      },
    });
    if (!payment) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Payment not found');
    return payment;
  }

  async refund(id: string, ctx: RequestContext) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Payment not found');
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Payment already refunded');
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });

    if (payment.invoiceId) {
      await this.invoicesService.recomputeStatus(payment.invoiceId);
    }

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PAYMENT_REFUNDED,
      entityType: 'Payment',
      entityId: id,
      before: { status: payment.status },
      after: { status: PaymentStatus.REFUNDED },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Payment not found');

    await this.prisma.payment.delete({ where: { id } });

    if (payment.invoiceId) {
      await this.invoicesService.recomputeStatus(payment.invoiceId);
    }

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PAYMENT_DELETED,
      entityType: 'Payment',
      entityId: id,
      before: { paymentNumber: payment.paymentNumber },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  private async nextNumber(prefix: string): Promise<string> {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 46655)
      .toString(36)
      .toUpperCase();
    return `${prefix}-${ts}${rand}`;
  }
}
