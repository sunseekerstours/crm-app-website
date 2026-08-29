import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AuditableAction, InvoiceStatus } from '@prisma/client';

export interface InvoiceListParams {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
  bookingId?: string;
  status?: string;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateInvoiceDto, ctx: RequestContext) {
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
      if (!booking)
        throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');
      if (!dto.customerId) dto.customerId = booking.customerId;
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: await this.nextNumber('INV'),
        bookingId: dto.bookingId,
        customerId: dto.customerId,
        amount: dto.amount,
        currency: dto.currency ?? 'GHS',
        amountPaid: 0,
        status: InvoiceStatus.DRAFT,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById: ctx.userId,
      },
      include: { booking: { select: { id: true, bookingNumber: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.INVOICE_CREATED,
      entityType: 'Invoice',
      entityId: invoice.id,
      after: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amount: invoice.amount?.toString(),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return invoice;
  }

  async findAll(params: InvoiceListParams) {
    const where: Record<string, unknown> = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.bookingId) where.bookingId = params.bookingId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [{ invoiceNumber: { contains: params.search } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { booking: { select: { id: true, bookingNumber: true } }, payments: true },
      }),
      this.prisma.invoice.count({ where }),
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
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: { select: { id: true, bookingNumber: true, tourName: true } },
        payments: true,
      },
    });
    if (!invoice) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Invoice not found');
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, ctx: RequestContext) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Invoice not found');

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        amount: dto.amount,
        currency: dto.currency,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.INVOICE_UPDATED,
      entityType: 'Invoice',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async issue(id: string, ctx: RequestContext) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Invoice not found');
    if (existing.status === InvoiceStatus.PAID) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Cannot issue a paid invoice');
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED, issueDate: existing.issueDate ?? new Date() },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.INVOICE_STATUS_CHANGED,
      entityType: 'Invoice',
      entityId: id,
      before: { status: existing.status },
      after: { status: InvoiceStatus.ISSUED },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return invoice;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Invoice not found');

    const payments = await this.prisma.payment.count({ where: { invoiceId: id } });
    if (payments > 0) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete an invoice with payments',
      );
    }

    await this.prisma.invoice.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.INVOICE_DELETED,
      entityType: 'Invoice',
      entityId: id,
      before: { invoiceNumber: existing.invoiceNumber },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  /** Recompute invoice status from payments. Returns updated invoice. */
  async recomputeStatus(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!invoice) return null;

    const paid = invoice.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const amount = Number(invoice.amount ?? 0);

    let status = invoice.status;
    if (invoice.status === InvoiceStatus.CANCELLED) status = InvoiceStatus.CANCELLED;
    else if (paid >= amount && amount > 0) status = InvoiceStatus.PAID;
    else if (paid > 0) status = InvoiceStatus.PARTIALLY_PAID;
    else if (invoice.status === InvoiceStatus.ISSUED) status = InvoiceStatus.ISSUED;
    else status = InvoiceStatus.DRAFT;

    return this.prisma.invoice.update({
      where: { id },
      data: { status, amountPaid: paid },
    });
  }

  private async nextNumber(prefix: string): Promise<string> {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 46655)
      .toString(36)
      .toUpperCase();
    return `${prefix}-${ts}${rand}`;
  }
}
