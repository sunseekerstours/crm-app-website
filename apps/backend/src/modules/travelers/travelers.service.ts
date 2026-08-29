import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateTravelerDto } from './dto/create-traveler.dto';
import { UpdateTravelerDto } from './dto/update-traveler.dto';
import { Prisma, AuditableAction } from '@prisma/client';
@Injectable()
export class TravelersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTravelerDto, ctx: RequestContext) {
    const traveler = await this.prisma.traveler.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        nationality: dto.nationality,
        passportNumber: dto.passportNumber,
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TRAVELER_CREATED,
      entityType: 'Traveler',
      entityId: traveler.id,
      after: { firstName: traveler.firstName, lastName: traveler.lastName },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return traveler;
  }

  async findAll(params: { page: number; limit: number; search?: string; nationality?: string }) {
    const where: Prisma.TravelerWhereInput = {};
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { passportNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.nationality) where.nationality = params.nationality;

    const [items, total] = await Promise.all([
      this.prisma.traveler.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.traveler.count({ where }),
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
    const traveler = await this.prisma.traveler.findUnique({
      where: { id },
      include: { bookings: { include: { booking: true } } },
    });
    if (!traveler)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Traveler not found');
    return traveler;
  }

  async update(id: string, dto: UpdateTravelerDto, ctx: RequestContext) {
    const existing = await this.prisma.traveler.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Traveler not found');

    const updated = await this.prisma.traveler.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        nationality: dto.nationality,
        passportNumber: dto.passportNumber,
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TRAVELER_UPDATED,
      entityType: 'Traveler',
      entityId: id,
      before: { firstName: existing.firstName, lastName: existing.lastName },
      after: { firstName: updated.firstName, lastName: updated.lastName },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.traveler.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Traveler not found');

    await this.prisma.traveler.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TRAVELER_DELETED,
      entityType: 'Traveler',
      entityId: id,
      before: { firstName: existing.firstName, lastName: existing.lastName },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
