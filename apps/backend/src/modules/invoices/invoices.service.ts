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

    let calculatedAmount = dto.amount;
    if (calculatedAmount == null && Array.isArray(dto.items) && dto.items.length > 0) {
      const subtotal = dto.items.reduce((sum, it) => sum + (Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0);
      const tax = Number(dto.tax) || 0;
      const discount = Number(dto.discount) || 0;
      calculatedAmount = Math.max(0, subtotal + tax - discount);
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: await this.nextNumber('INV'),
        bookingId: dto.bookingId,
        customerId: dto.customerId,
        dealId: dto.dealId,
        amount: calculatedAmount ?? 0,
        currency: dto.currency ?? 'USD',
        amountPaid: 0,
        status: InvoiceStatus.DRAFT,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        items: dto.items ?? [],
        tax: dto.tax,
        discount: dto.discount,
        notes: dto.notes,
        terms: dto.terms,
        createdById: ctx.userId,
      },
      include: {
        customer: true,
        deal: true,
        booking: { select: { id: true, bookingNumber: true, tourName: true } },
      },
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
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          deal: true,
          booking: { select: { id: true, bookingNumber: true, tourName: true } },
          payments: true,
        },
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
        customer: true,
        deal: true,
        booking: { select: { id: true, bookingNumber: true, tourName: true, customer: true } },
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

    let calculatedAmount = dto.amount;
    if (calculatedAmount == null && Array.isArray(dto.items) && dto.items.length > 0) {
      const subtotal = dto.items.reduce((sum, it) => sum + (Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0);
      const tax = Number(dto.tax ?? existing.tax) || 0;
      const discount = Number(dto.discount ?? existing.discount) || 0;
      calculatedAmount = Math.max(0, subtotal + tax - discount);
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        amount: calculatedAmount !== undefined ? calculatedAmount : existing.amount,
        currency: dto.currency,
        customerId: dto.customerId,
        bookingId: dto.bookingId,
        dealId: dto.dealId,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        items: dto.items !== undefined ? dto.items : undefined,
        tax: dto.tax !== undefined ? dto.tax : undefined,
        discount: dto.discount !== undefined ? dto.discount : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
        terms: dto.terms !== undefined ? dto.terms : undefined,
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        customer: true,
        deal: true,
        booking: { select: { id: true, bookingNumber: true, tourName: true } },
        payments: true,
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
