import { Injectable } from '@nestjs/common';
import { RequestContext } from '@app/common/request-context';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { AuditService } from '@app/modules/audit/audit.service';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { PrismaService } from '@app/prisma/prisma.service';
import { Prisma, AuditableAction } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class GuidesService {
  private readonly entityType = 'Guide';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateGuideDto, ctx: RequestContext) {
    const guide = await this.prisma.guide.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber,
        languages: dto.languages ?? [],
        specialities: dto.specialities ?? [],
        supplierId: dto.supplierId,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.GUIDE_CREATED,
      entityType: this.entityType,
      entityId: guide.id,
      after: { name: `${guide.firstName} ${guide.lastName ?? ''}`.trim() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return guide;
  }

  async findAll(params: ListParams) {
    const where: Prisma.GuideWhereInput = {};
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { licenseNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.guide.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { firstName: 'asc' },
        include: { supplier: { select: { id: true, name: true } } },
      }),
      this.prisma.guide.count({ where }),
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
    const guide = await this.prisma.guide.findUnique({
      where: { id },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (!guide) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Guide not found');
    return guide;
  }

  async update(id: string, dto: UpdateGuideDto, ctx: RequestContext) {
    const existing = await this.prisma.guide.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Guide not found');
    const updated = await this.prisma.guide.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber,
        languages: dto.languages,
        specialities: dto.specialities,
        supplierId: dto.supplierId,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.GUIDE_UPDATED,
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
    const existing = await this.prisma.guide.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Guide not found');
    await this.prisma.guide.delete({ where: { id } });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.GUIDE_DELETED,
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
