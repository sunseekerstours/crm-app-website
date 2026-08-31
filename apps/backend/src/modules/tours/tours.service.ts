import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { slugify } from '@app/common/slugify';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { Prisma, AuditableAction, TourStatus, DepartureStatus } from '@prisma/client';

@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTourDto, ctx: RequestContext) {
    const slug = dto.slug ?? slugify(dto.name);
    const exists = await this.prisma.tour.findUnique({ where: { slug } });
    if (exists) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'A tour with this slug already exists');
    }

    const tour = await this.prisma.tour.create({
      data: {
        name: dto.name,
        slug,
        summary: dto.summary,
        description: dto.description,
        durationDays: dto.durationDays ?? 0,
        type: dto.type,
        difficulty: dto.difficulty,
        minPax: dto.minPax ?? 1,
        maxPax: dto.maxPax,
        inclusions: dto.inclusions ?? [],
        exclusions: dto.exclusions ?? [],
        highlights: dto.highlights ?? [],
        coverImage: dto.coverImage,
        images: dto.images ?? [],
        videoUrl: dto.videoUrl,
        currency: dto.currency ?? 'GHS',
        basePrice: dto.basePrice,
        status: dto.status ?? TourStatus.DRAFT,
        createdById: ctx.userId,
        destinations: dto.destinationIds?.length
          ? {
              create: dto.destinationIds.map((id) => ({ destination: { connect: { id } } })),
            }
          : undefined,
        days: dto.days?.length ? { create: dto.days.map((d) => toDayData(d)) } : undefined,
      },
      include: { destinations: { include: { destination: true } }, days: true },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TOUR_CREATED,
      entityType: 'Tour',
      entityId: tour.id,
      after: { name: tour.name, status: tour.status, durationDays: tour.durationDays },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return tour;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    destinationId?: string;
  }) {
    const where: Prisma.TourWhereInput = {};
    if (params.search) {
      where.OR = [{ name: { contains: params.search, mode: 'insensitive' } }];
    }
    if (params.status) where.status = params.status as TourStatus;
    if (params.destinationId) {
      where.destinations = { some: { destinationId: params.destinationId } };
    }

    const [items, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          destinations: {
            select: { destination: { select: { id: true, name: true, slug: true } } },
          },
          _count: { select: { departures: true, days: true } },
        },
      }),
      this.prisma.tour.count({ where }),
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
    const tour = await this.prisma.tour.findUnique({
      where: { id },
      include: {
        destinations: { include: { destination: true } },
        days: { orderBy: { dayNumber: 'asc' }, include: { destination: true } },
        departures: { orderBy: { startDate: 'asc' } },
      },
    });
    if (!tour) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Tour not found');
    return tour;
  }

  async update(id: string, dto: UpdateTourDto, ctx: RequestContext) {
    const existing = await this.prisma.tour.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Tour not found');

    if (dto.slug && dto.slug !== existing.slug) {
      const taken = await this.prisma.tour.findUnique({ where: { slug: dto.slug } });
      if (taken) throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Tour slug already in use');
    }

    const updated = await this.prisma.tour.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        summary: dto.summary,
        description: dto.description,
        durationDays: dto.durationDays,
        type: dto.type,
        difficulty: dto.difficulty,
        minPax: dto.minPax,
        maxPax: dto.maxPax,
        inclusions: dto.inclusions,
        exclusions: dto.exclusions,
        highlights: dto.highlights,
        coverImage: dto.coverImage,
        images: dto.images,
        videoUrl: dto.videoUrl,
        currency: dto.currency,
        basePrice: dto.basePrice,
        status: dto.status,
        ...(dto.destinationIds !== undefined
          ? {
              destinations: {
                deleteMany: {},
                create: dto.destinationIds.map((destId) => ({
                  destination: { connect: { id: destId } },
                })),
              },
            }
          : {}),
        ...(dto.days !== undefined
          ? { days: { deleteMany: {}, create: dto.days.map((d) => toDayData(d)) } }
          : {}),
      },
      include: { destinations: { include: { destination: true } }, days: true },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TOUR_UPDATED,
      entityType: 'Tour',
      entityId: id,
      before: { name: existing.name, status: existing.status },
      after: { name: updated.name, status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async publish(id: string, ctx: RequestContext) {
    const existing = await this.prisma.tour.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Tour not found');

    const tour = await this.prisma.tour.update({
      where: { id },
      data: { status: TourStatus.ACTIVE },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TOUR_PUBLISHED,
      entityType: 'Tour',
      entityId: id,
      before: { status: existing.status },
      after: { status: TourStatus.ACTIVE },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return tour;
  }

  /** Availability across a tour's departures (PRD §Availability). */
  async availability(id: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id } });
    if (!tour) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Tour not found');

    const departures = await this.prisma.departure.findMany({
      where: { tourId: id, status: { not: DepartureStatus.CANCELLED } },
      orderBy: { startDate: 'asc' },
    });

    const items = departures.map((d) => {
      const remaining = d.maxPax != null ? Math.max(d.maxPax - d.bookedCount, 0) : null;
      return {
        id: d.id,
        startDate: d.startDate,
        endDate: d.endDate,
        status: d.status,
        maxPax: d.maxPax,
        bookedCount: d.bookedCount,
        remaining,
        available: remaining === null ? true : remaining > 0,
      };
    });

    return { tourId: id, items };
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.tour.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Tour not found');

    const deps = await this.prisma.departure.count({ where: { tourId: id } });
    if (deps > 0) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete a tour that has departures',
      );
    }

    await this.prisma.tour.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TOUR_DELETED,
      entityType: 'Tour',
      entityId: id,
      before: { name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}

function toDayData(d: {
  dayNumber: number;
  title?: string;
  description?: string;
  meals?: string[];
  accommodation?: string;
  destinationId?: string;
}): Prisma.TourDayCreateWithoutTourInput {
  return {
    dayNumber: d.dayNumber,
    title: d.title,
    description: d.description,
    meals: d.meals ?? [],
    accommodation: d.accommodation,
    ...(d.destinationId ? { destination: { connect: { id: d.destinationId } } } : {}),
  };
}
