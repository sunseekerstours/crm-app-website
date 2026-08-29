import { Injectable } from '@nestjs/common';
import { RequestContext } from '@app/common/request-context';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { AuditService } from '@app/modules/audit/audit.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { PrismaService } from '@app/prisma/prisma.service';
import { Prisma, AuditableAction } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class DriversService {
  private readonly entityType = 'Driver';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateDriverDto, ctx: RequestContext) {
    const driver = await this.prisma.driver.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber,
        supplierId: dto.supplierId,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DRIVER_CREATED,
      entityType: this.entityType,
      entityId: driver.id,
      after: { name: `${driver.firstName} ${driver.lastName ?? ''}`.trim() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return driver;
  }

  async findAll(params: ListParams) {
    const where: Prisma.DriverWhereInput = {};
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { licenseNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { firstName: 'asc' },
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { vehicles: true } },
        },
      }),
      this.prisma.driver.count({ where }),
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
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        vehicles: { select: { id: true, name: true } },
      },
    });
    if (!driver) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Driver not found');
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto, ctx: RequestContext) {
    const existing = await this.prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Driver not found');
    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber,
        supplierId: dto.supplierId,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DRIVER_UPDATED,
      entityType: this.entityType,
      entityId: id,
      before: { name: `${existing.firstName} ${existing.lastName ?? ''}`.trim() },
      after: { name: `${updated.firstName} ${updated.lastName ?? ''}`.trim() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Driver not found');
    await this.prisma.driver.delete({ where: { id } });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DRIVER_DELETED,
      entityType: this.entityType,
      entityId: id,
      before: { name: `${existing.firstName} ${existing.lastName ?? ''}`.trim() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return { success: true };
  }
}
