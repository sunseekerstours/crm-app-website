import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { Prisma, AuditableAction, DealStage } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async create(dto: CreateDealDto, ctx: RequestContext) {
    const deal = await this.prisma.deal.create({
      data: {
        name: dto.name,
        customerId: dto.customerId,
        companyId: dto.companyId,
        leadId: dto.leadId,
        salespersonId: dto.salespersonId,
        tour: dto.tour,
        destination: dto.destination,
        value: dto.value,
        currency: dto.currency,
        probability: dto.probability,
        stage: dto.stage ?? DealStage.NEW,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        source: dto.source,
        notes: dto.notes,
        tags: dto.tags ?? [],
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEAL_CREATED,
      entityType: 'Deal',
      entityId: deal.id,
      after: { name: deal.name, stage: deal.stage, value: deal.value?.toString() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    const timelineEntity = dto.customerId ? 'CUSTOMER' : dto.leadId ? 'LEAD' : null;
    if (timelineEntity) {
      await this.timeline.record({
        entityType: timelineEntity,
        entityId: dto.customerId ?? dto.leadId!,
        type: 'deal.created',
        title: `Deal created: ${deal.name}`,
        actorId: ctx.userId,
        data: { dealId: deal.id },
      });
    }

    return deal;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    stage?: string;
    salespersonId?: string;
  }) {
    const where: Prisma.DealWhereInput = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    if (params.stage) where.stage = params.stage as DealStage;
    if (params.salespersonId) where.salespersonId = params.salespersonId;

    const [items, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.deal.count({ where }),
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
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!deal) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Deal not found');
    return deal;
  }

  async update(id: string, dto: UpdateDealDto, ctx: RequestContext) {
    const existing = await this.prisma.deal.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Deal not found');

    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        name: dto.name,
        customerId: dto.customerId,
        companyId: dto.companyId,
        leadId: dto.leadId,
        salespersonId: dto.salespersonId,
        tour: dto.tour,
        destination: dto.destination,
        value: dto.value,
        currency: dto.currency,
        probability: dto.probability,
        stage: dto.stage,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        source: dto.source,
        notes: dto.notes,
        tags: dto.tags,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEAL_UPDATED,
      entityType: 'Deal',
      entityId: id,
      before: { stage: existing.stage },
      after: { stage: updated.stage },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    if (existing.stage !== updated.stage) {
      await this.timeline.record({
        entityType: dto.customerId ? 'CUSTOMER' : 'LEAD',
        entityId: dto.customerId ?? dto.leadId ?? existing.customerId ?? existing.leadId ?? '',
        type: 'deal.stage_changed',
        title: `Deal "${updated.name}" moved to ${updated.stage}`,
        description: `${existing.stage} → ${updated.stage}`,
        actorId: ctx.userId,
        data: { dealId: id, from: existing.stage, to: updated.stage },
      });
    }

    return updated;
  }

  /** Pipeline summary: counts and total value grouped by stage (§28, §62). */
  async pipelineSummary() {
    const groups = await this.prisma.deal.groupBy({
      by: ['stage'],
      _count: { _all: true },
      _sum: { value: true },
    });
    return groups.map((g) => ({
      stage: g.stage,
      count: g._count._all,
      totalValue: g._sum.value?.toString() ?? '0',
    }));
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.deal.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Deal not found');

    await this.prisma.deal.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.DEAL_DELETED,
      entityType: 'Deal',
      entityId: id,
      before: { name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
