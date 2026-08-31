import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { slugify } from '@app/common/slugify';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { Prisma, AuditableAction } from '@prisma/client';

@Injectable()
export class DestinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateDestinationDto, ctx: RequestContext) {
    const slug = dto.slug ?? slugify(dto.name);
    const exists = await this.prisma.destination.findUnique({ where: { slug } });
    if (exists) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'A destination with this slug already exists',
      );
    }

    const destination = await this.prisma.destination.create({
      data: {
        name: dto.name,
        country: dto.country,
        region: dto.region,
        slug,
        summary: dto.summary,
        description: dto.description,
        highlights: dto.highlights ?? [],
        coverImage: dto.coverImage,
        images: dto.images ?? [],
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DESTINATION_CREATED,
      entityType: 'Destination',
      entityId: destination.id,
      after: { name: destination.name, country: destination.country },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return destination;
  }

  async findAll(params: { page: number; limit: number; search?: string; country?: string }) {
    const where: Prisma.DestinationWhereInput = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { country: { contains: params.search, mode: 'insensitive' } },
        { region: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.country) where.country = params.country;

    const [items, total] = await Promise.all([
      this.prisma.destination.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { name: 'asc' },
        include: {
          tours: {
            select: {
              tour: {
                select: { id: true, name: true, slug: true, durationDays: true, status: true, coverImage: true },
              },
            },
          },
          _count: { select: { tours: true } },
        },
      }),
      this.prisma.destination.count({ where }),
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
    const destination = await this.prisma.destination.findUnique({
      where: { id },
      include: {
        tours: {
          select: {
            tour: {
              select: { id: true, name: true, slug: true, durationDays: true, status: true, coverImage: true, basePrice: true, currency: true },
            },
          },
        },
      },
    });
    if (!destination)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Destination not found');
    return destination;
  }

  async update(id: string, dto: UpdateDestinationDto, ctx: RequestContext) {
    const existing = await this.prisma.destination.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Destination not found');

    if (dto.slug && dto.slug !== existing.slug) {
      const taken = await this.prisma.destination.findUnique({ where: { slug: dto.slug } });
      if (taken)
        throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Destination slug already in use');
    }

    const updated = await this.prisma.destination.update({
      where: { id },
      data: {
        name: dto.name,
        country: dto.country,
        region: dto.region,
        slug: dto.slug,
        summary: dto.summary,
        description: dto.description,
        highlights: dto.highlights,
        coverImage: dto.coverImage,
        images: dto.images,
        isActive: dto.isActive,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DESTINATION_UPDATED,
      entityType: 'Destination',
      entityId: id,
      before: { name: existing.name },
      after: { name: updated.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.destination.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Destination not found');

    await this.prisma.destination.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DESTINATION_DELETED,
      entityType: 'Destination',
      entityId: id,
      before: { name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
