import { Injectable } from '@nestjs/common';
import { RequestContext } from '@app/common/request-context';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { AuditService } from '@app/modules/audit/audit.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { PrismaService } from '@app/prisma/prisma.service';
import { Prisma, AuditableAction } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  departureId?: string;
}

@Injectable()
export class ChecklistsService {
  private readonly entityType = 'ChecklistItem';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateChecklistItemDto, ctx: RequestContext) {
    const item = await this.prisma.checklistItem.create({
      data: {
        title: dto.title,
        departureId: dto.departureId,
        description: dto.description,
        category: dto.category,
        isRequired: dto.isRequired ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CHECKLIST_CREATED,
      entityType: this.entityType,
      entityId: item.id,
      after: { title: item.title },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });
    return item;
  }

  async findAll(params: ListParams) {
    const where: Prisma.ChecklistItemWhereInput = {};
    if (params.departureId) where.departureId = params.departureId;
    if (params.search) where.title = { contains: params.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.checklistItem.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.checklistItem.count({ where }),
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
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Checklist item not found');
    return item;
  }

  async update(id: string, dto: UpdateChecklistItemDto, ctx: RequestContext) {
    const existing = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Checklist item not found');

    const item = await this.prisma.checklistItem.update({
      where: { id },
      data: {
        title: dto.title,
        departureId: dto.departureId,
        description: dto.description,
        category: dto.category,
        isRequired: dto.isRequired,
        isCompleted: dto.isCompleted,
        completedById:
          dto.isCompleted === undefined ? undefined : dto.isCompleted ? ctx.userId : null,
        completedAt:
          dto.isCompleted === undefined ? undefined : dto.isCompleted ? new Date() : null,
        sortOrder: dto.sortOrder,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action:
        dto.isCompleted === true
          ? AuditableAction.CHECKLIST_COMPLETED
          : AuditableAction.CHECKLIST_UPDATED,
      entityType: this.entityType,
      entityId: id,
      before: { title: existing.title, isCompleted: existing.isCompleted },
      after: { title: item.title, isCompleted: item.isCompleted },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return item;
  }

  async toggleComplete(id: string, completed: boolean, ctx: RequestContext) {
    const existing = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Checklist item not found');

    const item = await this.prisma.checklistItem.update({
      where: { id },
      data: {
        isCompleted: completed,
        completedById: completed ? ctx.userId : null,
        completedAt: completed ? new Date() : null,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: completed ? AuditableAction.CHECKLIST_COMPLETED : AuditableAction.CHECKLIST_UPDATED,
      entityType: this.entityType,
      entityId: id,
      before: { isCompleted: existing.isCompleted },
      after: { isCompleted: item.isCompleted },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return item;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Checklist item not found');

    await this.prisma.checklistItem.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CHECKLIST_DELETED,
      entityType: this.entityType,
      entityId: id,
      before: { title: existing.title },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
