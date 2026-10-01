import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AuditableAction, BookingStatus } from '@prisma/client';

export interface BookingListParams {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
  status?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async create(dto: CreateBookingDto, ctx: RequestContext) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Customer not found');

    const paxCount = dto.paxCount ?? 1;
    const bookingNumber = await this.nextNumber('BKG');

    const booking = await this.prisma.$transaction(async (tx) =>
      tx.booking.create({
        data: {
          bookingNumber,
          customerId: customer.id,
          tourName: dto.tourName,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          status: dto.status ?? BookingStatus.PENDING,
          paxCount,
          totalPrice: dto.totalPrice,
          currency: dto.currency ?? 'GHS',
          notes: dto.notes,
          createdById: ctx.userId,
          travelers: dto.travelerIds?.length
            ? {
                create: dto.travelerIds.map((travelerId) => ({
                  travelerId,
                })),
              }
            : undefined,
        },
        include: { customer: true, travelers: { include: { traveler: true } } },
      }),
    );

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_CREATED,
      entityType: 'Booking',
      entityId: booking.id,
      after: {
        bookingNumber,
        status: booking.status,
        paxCount,
        totalPrice: booking.totalPrice?.toString(),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: 'CUSTOMER',
      entityId: customer.id,
      type: 'booking.created',
      title: 'Booking created',
      description: `${bookingNumber} — ${booking.tourName ?? 'Tour'}`,
      actorId: ctx.userId,
    });

    return booking;
  }

  async findAll(params: BookingListParams) {
    const where: Record<string, unknown> = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.bookedAt = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }
    if (params.search) {
      where.OR = [
        { bookingNumber: { contains: params.search, mode: 'insensitive' } },
        { tourName: { contains: params.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          travelers: { include: { traveler: true } },
        },
      }),
      this.prisma.booking.count({ where }),
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
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        travelers: { include: { traveler: true } },
        invoices: true,
        payments: true,
      },
    });
    if (!booking) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');
    return booking;
  }

  async update(id: string, dto: UpdateBookingDto, ctx: RequestContext) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');

    if (existing.status === BookingStatus.CANCELLED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Cannot update a cancelled booking');
    }

    const statusChanged = dto.status && dto.status !== existing.status;

    const updated = await this.prisma.$transaction(async (tx) =>
      tx.booking.update({
        where: { id },
        data: {
          tourName: dto.tourName,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          status: dto.status,
          paxCount: dto.paxCount,
          totalPrice: dto.totalPrice,
          currency: dto.currency,
          notes: dto.notes,
        },
        include: { customer: true },
      }),
    );

    await this.audit.record({
      userId: ctx.userId,
      action: statusChanged
        ? AuditableAction.BOOKING_STATUS_CHANGED
        : AuditableAction.BOOKING_UPDATED,
      entityType: 'Booking',
      entityId: id,
      before: { status: existing.status, paxCount: existing.paxCount },
      after: { status: updated.status, paxCount: updated.paxCount },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    if (statusChanged && updated.status === BookingStatus.CONFIRMED && updated.customerId) {
      await this.timeline.record({
        entityType: 'CUSTOMER',
        entityId: updated.customerId,
        type: 'booking.confirmed',
        title: 'Booking confirmed',
        description: `${updated.bookingNumber} confirmed`,
        actorId: ctx.userId,
      });
    }

    return updated;
  }

  async confirm(id: string, dto: UpdateBookingDto = {}, ctx: RequestContext) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');

    if (existing.status === BookingStatus.CANCELLED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Cannot confirm a cancelled booking');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CONFIRMED,
        tourName: dto.tourName !== undefined ? dto.tourName : existing.tourName,
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        paxCount: dto.paxCount !== undefined ? dto.paxCount : existing.paxCount,
        totalPrice: dto.totalPrice !== undefined ? dto.totalPrice : existing.totalPrice,
        currency: dto.currency !== undefined ? dto.currency : existing.currency,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_STATUS_CHANGED,
      entityType: 'Booking',
      entityId: id,
      before: { status: existing.status, totalPrice: existing.totalPrice?.toString() },
      after: { status: BookingStatus.CONFIRMED, totalPrice: updated.totalPrice?.toString() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: 'CUSTOMER',
      entityId: existing.customerId,
      type: 'booking.confirmed',
      title: 'Booking confirmed',
      description: `${existing.bookingNumber} confirmed`,
      actorId: ctx.userId,
    });

    return updated;
  }

  async cancel(id: string, ctx: RequestContext) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');

    if (existing.status === BookingStatus.CANCELLED) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Booking already cancelled');
    }

    await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_CANCELLED,
      entityType: 'Booking',
      entityId: id,
      before: { status: existing.status },
      after: { status: BookingStatus.CANCELLED },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: 'CUSTOMER',
      entityId: existing.customerId,
      type: 'booking.cancelled',
      title: 'Booking cancelled',
      description: `${existing.bookingNumber} cancelled`,
      actorId: ctx.userId,
    });

    return { id, status: BookingStatus.CANCELLED };
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');

    await this.prisma.booking.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_DELETED,
      entityType: 'Booking',
      entityId: id,
      before: { bookingNumber: existing.bookingNumber },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  async addTraveler(id: string, travelerId: string, ctx: RequestContext, lead = false) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');
    const traveler = await this.prisma.traveler.findUnique({ where: { id: travelerId } });
    if (!traveler)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Traveler not found');

    const link = await this.prisma.bookingTraveler.upsert({
      where: { bookingId_travelerId: { bookingId: id, travelerId } },
      create: { bookingId: id, travelerId, isLead: lead },
      update: { isLead: lead },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_UPDATED,
      entityType: 'Booking',
      entityId: id,
      after: { travelerId, linkId: link.bookingId },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return this.findById(id);
  }

  async removeTraveler(id: string, travelerId: string, ctx: RequestContext) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found');

    await this.prisma.bookingTraveler.delete({
      where: { bookingId_travelerId: { bookingId: id, travelerId } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.BOOKING_UPDATED,
      entityType: 'Booking',
      entityId: id,
      before: { travelerId },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return this.findById(id);
  }

  private async nextNumber(prefix: string): Promise<string> {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 46655)
      .toString(36)
      .toUpperCase();
    return `${prefix}-${ts}${rand}`;
  }
}
