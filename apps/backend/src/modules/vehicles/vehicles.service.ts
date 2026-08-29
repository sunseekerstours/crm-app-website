import { Injectable } from '@nestjs/common';
import { RequestContext } from '@app/common/request-context';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { AuditService } from '@app/modules/audit/audit.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PrismaService } from '@app/prisma/prisma.service';
import { Prisma, AuditableAction, VehicleType } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  type?: string;
}

@Injectable()
export class VehiclesService {
  private readonly entityType = 'Vehicle';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateVehicleDto, ctx: RequestContext) {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        name: dto.name,
        registrationNo: dto.registrationNo,
        type: dto.type ?? VehicleType.VAN,
        capacity: dto.capacity,
        ownerSupplierId: dto.ownerSupplierId,
        driverId: dto.driverId,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.VEHICLE_CREATED,
      entityType: this.entityType,
      entityId: vehicle.id,
      after: { name: vehicle.name, registrationNo: vehicle.registrationNo },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return vehicle;
  }

  async findAll(params: ListParams) {
    const where: Prisma.VehicleWhereInput = {};
    if (params.type) where.type = params.type as VehicleType;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { registrationNo: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { name: 'asc' },
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.vehicle.count({ where }),
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
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        ownerSupplier: { select: { id: true, name: true } },
      },
    });
    if (!vehicle) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Vehicle not found');
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto, ctx: RequestContext) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Vehicle not found');
    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        name: dto.name,
        registrationNo: dto.registrationNo,
        type: dto.type,
        capacity: dto.capacity,
        ownerSupplierId: dto.ownerSupplierId,
        driverId: dto.driverId,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.VEHICLE_UPDATED,
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
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Vehicle not found');
    await this.prisma.vehicle.delete({ where: { id } });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.VEHICLE_DELETED,
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
