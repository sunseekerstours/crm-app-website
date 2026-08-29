import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Prisma, AuditableAction, SupplierType } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  type?: string;
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateSupplierDto, ctx: RequestContext) {
    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        type: dto.type ?? SupplierType.OTHER,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        address: dto.address,
        country: dto.country,
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.SUPPLIER_CREATED,
      entityType: 'Supplier',
      entityId: supplier.id,
      after: { name: supplier.name, type: supplier.type },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return supplier;
  }

  async findAll(params: ListParams) {
    const where: Prisma.SupplierWhereInput = {};
    if (params.type) where.type = params.type as SupplierType;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { country: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { hotels: true, vehicles: true, guides: true, drivers: true } },
        },
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        hotels: { select: { id: true, name: true } },
        vehicles: { select: { id: true, name: true } },
        guides: { select: { id: true, firstName: true, lastName: true } },
        drivers: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!supplier)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Supplier not found');
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, ctx: RequestContext) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Supplier not found');

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        address: dto.address,
        country: dto.country,
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.SUPPLIER_UPDATED,
      entityType: 'Supplier',
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
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Supplier not found');

    await this.prisma.supplier.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.SUPPLIER_DELETED,
      entityType: 'Supplier',
      entityId: id,
      before: { name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
