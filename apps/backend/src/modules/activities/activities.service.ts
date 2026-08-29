import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ActivityListQueryDto } from './dto/activity-list-query.dto';
import { Prisma, AuditableAction, ActivityType } from '@prisma/client';

export interface CreateActivityForEntity {
  entityType: 'CUSTOMER' | 'LEAD' | 'DEAL';
  entityId: string;
}

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async create(dto: CreateActivityDto, target: CreateActivityForEntity, ctx: RequestContext) {
    const data: Prisma.ActivityCreateInput = {
      type: dto.type,
      subject: dto.subject,
      description: dto.description,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      createdBy: ctx.userId ? { connect: { id: ctx.userId } } : undefined,
    };

    switch (target.entityType) {
      case 'CUSTOMER':
        data.customer = { connect: { id: target.entityId } };
        break;
      case 'LEAD':
        data.lead = { connect: { id: target.entityId } };
        break;
      case 'DEAL':
        data.deal = { connect: { id: target.entityId } };
        break;
    }

    const activity = await this.prisma.activity.create({ data });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.ACTIVITY_CREATED,
      entityType: 'Activity',
      entityId: activity.id,
      after: { type: activity.type, subject: activity.subject },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: target.entityType,
      entityId: target.entityId,
      type: `activity.${activity.type.toLowerCase()}`,
      title: `${activity.type} activity`,
      description: activity.subject ?? activity.description,
      actorId: ctx.userId,
      data: { activityId: activity.id },
    });

    return activity;
  }

  async findAll(params: ActivityListQueryDto) {
    const where: Prisma.ActivityWhereInput = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.leadId) where.leadId = params.leadId;
    if (params.dealId) where.dealId = params.dealId;
    if (params.type) where.type = params.type as ActivityType;

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { occurredAt: 'desc' },
        include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.activity.count({ where }),
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

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Activity not found');

    await this.prisma.activity.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.ACTIVITY_DELETED,
      entityType: 'Activity',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
