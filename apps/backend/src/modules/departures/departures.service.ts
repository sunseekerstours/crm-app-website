import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import {
  ApiNotFoundException,
  ApiBadRequestException,
  ApiConflictException,
  ErrorCode,
} from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';
import { CreateDeparturePricingDto } from './dto/create-departure-pricing.dto';
import { Prisma, AuditableAction, DepartureStatus } from '@prisma/client';

@Injectable()
export class DeparturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateDepartureDto, ctx: RequestContext) {
    await this.assertValid(
      dto.startDate,
      dto.endDate,
      dto.minPax,
      dto.maxPax,
      dto.maxPax != null ? 0 : undefined,
      dto.tourId,
    );

    const departure = await this.prisma.departure.create({
      data: {
        tourId: dto.tourId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? DepartureStatus.SCHEDULED,
        minPax: dto.minPax ?? 1,
        maxPax: dto.maxPax,
        price: dto.price,
        currency: dto.currency ?? 'GHS',
        note: dto.note,
        pricing: dto.pricing?.length
          ? {
              create: dto.pricing.map((p) => ({
                name: p.name,
                price: p.price,
                currency: p.currency ?? 'GHS',
              })),
            }
          : undefined,
      },
      include: { tour: { select: { id: true, name: true } }, pricing: true },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEPARTURE_CREATED,
      entityType: 'Departure',
      entityId: departure.id,
      after: {
        startDate: departure.startDate.toISOString(),
        status: departure.status,
        bookedCount: departure.bookedCount,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return departure;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    tourId?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    const where: Prisma.DepartureWhereInput = {};
    if (params.tourId) where.tourId = params.tourId;
    if (params.status) where.status = params.status as DepartureStatus;
    if (params.from || params.to) {
      where.startDate = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.departure.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { startDate: 'asc' },
        include: { tour: { select: { id: true, name: true } }, pricing: true },
      }),
      this.prisma.departure.count({ where }),
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
    const departure = await this.prisma.departure.findUnique({
      where: { id },
      include: { tour: { select: { id: true, name: true } }, pricing: true },
    });
    if (!departure)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');
    return departure;
  }

  async update(id: string, dto: UpdateDepartureDto, ctx: RequestContext) {
    const existing = await this.prisma.departure.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    const minPax = dto.minPax ?? existing.minPax;
    const maxPax = dto.maxPax ?? existing.maxPax;
    const bookedCount = existing.bookedCount;

    await this.assertValid(startDate, endDate, minPax, maxPax, bookedCount, dto.tourId);

    const updated = await this.prisma.departure.update({
      where: { id },
      data: {
        tourId: dto.tourId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
        minPax: dto.minPax,
        maxPax: dto.maxPax,
        price: dto.price,
        currency: dto.currency,
        note: dto.note,
      },
      include: { tour: { select: { id: true, name: true } }, pricing: true },
    });

    const action =
      existing.status !== updated.status
        ? AuditableAction.DEPARTURE_STATUS_CHANGED
        : AuditableAction.DEPARTURE_UPDATED;

    await this.audit.record({
      userId: ctx.userId,
      action,
      entityType: 'Departure',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async addPricing(departureId: string, dto: CreateDeparturePricingDto, ctx: RequestContext) {
    const departure = await this.prisma.departure.findUnique({ where: { id: departureId } });
    if (!departure)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');

    const pricing = await this.prisma.departurePricing.create({
      data: { departureId, name: dto.name, price: dto.price, currency: dto.currency ?? 'GHS' },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEPARTURE_UPDATED,
      entityType: 'Departure',
      entityId: departureId,
      after: { pricingId: pricing.id, name: pricing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return pricing;
  }

  async updatePricing(
    departureId: string,
    pricingId: string,
    dto: CreateDeparturePricingDto,
    ctx: RequestContext,
  ) {
    const pricing = await this.prisma.departurePricing.findFirst({
      where: { id: pricingId, departureId },
    });
    if (!pricing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Pricing tier not found');

    const updated = await this.prisma.departurePricing.update({
      where: { id: pricingId },
      data: { name: dto.name, price: dto.price, currency: dto.currency },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEPARTURE_UPDATED,
      entityType: 'Departure',
      entityId: departureId,
      after: { pricingId: updated.id, name: updated.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async removePricing(departureId: string, pricingId: string, ctx: RequestContext) {
    const pricing = await this.prisma.departurePricing.findFirst({
      where: { id: pricingId, departureId },
    });
    if (!pricing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Pricing tier not found');

    await this.prisma.departurePricing.delete({ where: { id: pricingId } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEPARTURE_UPDATED,
      entityType: 'Departure',
      entityId: departureId,
      before: { pricingId },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  /** Availability for a single departure: remaining seats (PRD §Availability). */
  async availability(id: string) {
    const departure = await this.prisma.departure.findUnique({ where: { id } });
    if (!departure)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');

    const remaining =
      departure.maxPax != null ? Math.max(departure.maxPax - departure.bookedCount, 0) : null;
    return {
      departureId: id,
      startDate: departure.startDate,
      endDate: departure.endDate,
      status: departure.status,
      maxPax: departure.maxPax,
      bookedCount: departure.bookedCount,
      remaining,
      available:
        departure.status === DepartureStatus.CANCELLED
          ? false
          : remaining === null
            ? true
            : remaining > 0,
    };
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.departure.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Departure not found');

    if (existing.bookedCount > 0) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete a departure with bookings',
      );
    }

    await this.prisma.departure.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEPARTURE_DELETED,
      entityType: 'Departure',
      entityId: id,
      before: { startDate: existing.startDate.toISOString() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  private async assertValid(
    start: string | Date,
    end: string | Date,
    minPax: number | null | undefined,
    maxPax: number | null | undefined,
    bookedCount: number | null | undefined,
    tourId?: string,
  ) {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    if (endDate < startDate) {
      throw new ApiBadRequestException(
        ErrorCode.BAD_REQUEST,
        'End date cannot be before start date',
      );
    }
    if (minPax != null && maxPax != null && minPax > maxPax) {
      throw new ApiBadRequestException(ErrorCode.BAD_REQUEST, 'minPax cannot exceed maxPax');
    }
    if (bookedCount != null && maxPax != null && bookedCount > maxPax) {
      throw new ApiBadRequestException(ErrorCode.BAD_REQUEST, 'Booked count exceeds maxPax');
    }
    if (tourId) {
      const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
      if (!tour)
        throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Associated tour not found');
    }
  }
}
