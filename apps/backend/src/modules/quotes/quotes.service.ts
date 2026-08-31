import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import {
  ApiNotFoundException,
  ApiConflictException,
  ErrorCode,
} from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { BookingsService } from '@app/modules/bookings/bookings.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { CreateBookingDto } from '@app/modules/bookings/dto/create-booking.dto';
import { AuditableAction, QuoteStatus } from '@prisma/client';

export interface QuoteListParams {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
  status?: string;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bookingsService: BookingsService,
  ) {}

  async create(dto: CreateQuoteDto, ctx: RequestContext) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer)
        throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Customer not found');
    }

    let tourName = dto.tourName;
    if (dto.departureId) {
      const departure = await this.prisma.departure.findUnique({
        where: { id: dto.departureId },
        include: { tour: { select: { name: true } } },
      });
      if (!departure)
        throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');
      tourName = tourName ?? departure.tour.name;
    }

    let calculatedTotal = dto.totalPrice;
    if (calculatedTotal == null && Array.isArray(dto.items) && dto.items.length > 0) {
      const subtotal = dto.items.reduce((sum, it) => sum + (Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0);
      const tax = Number(dto.tax) || 0;
      const discount = Number(dto.discount) || 0;
      calculatedTotal = Math.max(0, subtotal + tax - discount);
    }

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber: await this.nextNumber('QTE'),
        customerId: dto.customerId,
        dealId: dto.dealId,
        bookingId: dto.bookingId,
        departureId: dto.departureId,
        tourName,
        totalPrice: calculatedTotal ?? 0,
        currency: dto.currency ?? 'USD',
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        items: dto.items ?? [],
        tax: dto.tax,
        discount: dto.discount,
        notes: dto.notes,
        terms: dto.terms,
        createdById: ctx.userId,
      },
      include: { customer: true, departure: true, deal: true },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.QUOTE_CREATED,
      entityType: 'Quote',
      entityId: quote.id,
      after: {
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        totalPrice: quote.totalPrice?.toString(),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return quote;
  }

  async findAll(params: QuoteListParams) {
    const where: Record<string, unknown> = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { quoteNumber: { contains: params.search, mode: 'insensitive' } },
        { tourName: { contains: params.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          deal: true,
          departure: true,
          booking: true,
        },
      }),
      this.prisma.quote.count({ where }),
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
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { customer: true, departure: true, booking: true, deal: true },
    });
    if (!quote) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Quote not found');
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto, ctx: RequestContext) {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Quote not found');

    if (existing.status === QuoteStatus.CONVERTED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Cannot update a converted quote');
    }
    if (
      existing.status === QuoteStatus.ACCEPTED &&
      dto.status &&
      dto.status !== QuoteStatus.ACCEPTED
    ) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'Cannot revert an accepted quote to draft or expired',
      );
    }

    let calculatedTotal = dto.totalPrice;
    if (calculatedTotal == null && Array.isArray(dto.items) && dto.items.length > 0) {
      const subtotal = dto.items.reduce((sum, it) => sum + (Number(it.total) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0);
      const tax = Number(dto.tax ?? existing.tax) || 0;
      const discount = Number(dto.discount ?? existing.discount) || 0;
      calculatedTotal = Math.max(0, subtotal + tax - discount);
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        totalPrice: calculatedTotal !== undefined ? calculatedTotal : existing.totalPrice,
        currency: dto.currency,
        customerId: dto.customerId,
        dealId: dto.dealId,
        tourName: dto.tourName,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        status: dto.status,
        items: dto.items !== undefined ? dto.items : undefined,
        tax: dto.tax !== undefined ? dto.tax : undefined,
        discount: dto.discount !== undefined ? dto.discount : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
        terms: dto.terms !== undefined ? dto.terms : undefined,
      },
      include: { customer: true, departure: true, booking: true, deal: true },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.QUOTE_UPDATED,
      entityType: 'Quote',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async accept(id: string, ctx: RequestContext) {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Quote not found');
    if (existing.status === QuoteStatus.ACCEPTED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Quote already accepted');
    }
    if (existing.status === QuoteStatus.CONVERTED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Quote already converted');
    }

    const quote = await this.prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.ACCEPTED },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.QUOTE_ACCEPTED,
      entityType: 'Quote',
      entityId: id,
      before: { status: existing.status },
      after: { status: QuoteStatus.ACCEPTED },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return quote;
  }

  async convert(id: string, ctx: RequestContext) {
    return this.convertToBooking(id, ctx);
  }

  async convertToBooking(id: string, ctx: RequestContext) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { customer: true, departure: true },
    });
    if (!quote) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Quote not found');

    if (quote.status === QuoteStatus.CONVERTED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Quote has already been converted');
    }
    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'Only accepted quotes can be converted to bookings',
      );
    }
    if (!quote.customerId) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'Quote must have an associated customer to convert to a booking',
      );
    }

    const bookingDto: CreateBookingDto = {
      customerId: quote.customerId,
      departureId: quote.departureId ?? undefined,
      paxCount: 1,
      totalPrice: quote.totalPrice ? Number(quote.totalPrice) : undefined,
      currency: quote.currency ?? 'USD',
      notes: `Converted from quote ${quote.quoteNumber}`,
    };

    const booking = await this.bookingsService.create(bookingDto, ctx);

    await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.CONVERTED,
        bookingId: booking.id,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.QUOTE_CONVERTED,
      entityType: 'Quote',
      entityId: id,
      after: { bookingId: booking.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return booking;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Quote not found');

    await this.prisma.quote.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.QUOTE_DELETED,
      entityType: 'Quote',
      entityId: id,
      before: { quoteNumber: existing.quoteNumber },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
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
