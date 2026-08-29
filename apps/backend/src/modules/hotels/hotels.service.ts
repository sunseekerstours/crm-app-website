import { Injectable } from '@nestjs/common';
import { RequestContext } from '@app/common/request-context';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { AuditService } from '@app/modules/audit/audit.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { PrismaService } from '@app/prisma/prisma.service';
import { Prisma, AuditableAction } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

@Injectable()
export class HotelsService {
  private readonly entityType = 'Hotel';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateHotelDto, ctx: RequestContext) {
    const hotel = await this.prisma.hotel.create({
      data: {
        name: dto.name,
        supplierId: dto.supplierId,
        destinationId: dto.destinationId,
        starRating: dto.starRating,
        address: dto.address,
        country: dto.country,
        phone: dto.phone,
        email: dto.email,
        contactPerson: dto.contactPerson,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.HOTEL_CREATED,
      entityType: this.entityType,
      entityId: hotel.id,
      after: { name: hotel.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return hotel;
  }

  async findAll(params: ListParams) {
    const where: Prisma.HotelWhereInput = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { country: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.hotel.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.hotel.count({ where }),
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
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });
    if (!hotel) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Hotel not found');
    return hotel;
  }

  async update(id: string, dto: UpdateHotelDto, ctx: RequestContext) {
    const existing = await this.prisma.hotel.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Hotel not found');
    const updated = await this.prisma.hotel.update({
      where: { id },
      data: {
        name: dto.name,
        supplierId: dto.supplierId,
        destinationId: dto.destinationId,
        starRating: dto.starRating,
        address: dto.address,
        country: dto.country,
        phone: dto.phone,
        email: dto.email,
        contactPerson: dto.contactPerson,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.HOTEL_UPDATED,
      entityType: this.entityType,
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
    const existing = await this.prisma.hotel.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Hotel not found');
    await this.prisma.hotel.delete({ where: { id } });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.HOTEL_DELETED,
      entityType: this.entityType,
      entityId: id,
      before: { name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return { success: true };
  }
}
