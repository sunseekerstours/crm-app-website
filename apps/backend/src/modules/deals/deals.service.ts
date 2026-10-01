import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { SalesAutomationService } from '@app/modules/automation/sales-automation.service';
import { Prisma, AuditableAction, DealStage } from '@prisma/client';

export interface SalesStageConfig {
  id: string;
  key: string;
  name: string;
  color: string;
  order: number;
  description?: string;
}

export const DEFAULT_SALES_STAGES: SalesStageConfig[] = [
  { id: 'stage-1', key: 'NEW', name: 'Initial Inquiry', color: '#0284c7', order: 1, description: 'Fresh travel inquiry or tour request' },
  { id: 'stage-2', key: 'CONTACTED', name: 'Contacted & Discovery', color: '#8b5cf6', order: 2, description: 'Spoke with traveler, gathering preferences & dates' },
  { id: 'stage-3', key: 'QUALIFIED', name: 'Qualified & Itinerary', color: '#06b6d4', order: 3, description: 'Dates, passenger count, and route confirmed' },
  { id: 'stage-4', key: 'PROPOSAL', name: 'Custom Quote Sent', color: '#f59e0b', order: 4, description: 'Official quote (QTE-...) or proposal delivered' },
  { id: 'stage-5', key: 'NEGOTIATION', name: 'Negotiation & Fleet Selection', color: '#ec4899', order: 5, description: 'Adjusting itinerary, hotel, or car choices' },
  { id: 'stage-6', key: 'DEPOSIT', name: 'Awaiting Deposit', color: '#d97706', order: 6, description: 'Itinerary accepted, awaiting payment' },
  { id: 'stage-7', key: 'WON', name: 'Confirmed Booking (Won)', color: '#10b981', order: 7, description: 'Payment confirmed, tour booking locked in' },
  { id: 'stage-8', key: 'LOST', name: 'Lost / Cancelled', color: '#ef4444', order: 8, description: 'Client cancelled or chose alternate option' },
];

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
    private readonly salesAutomation: SalesAutomationService,
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
          recordedNotes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, content: true, createdAt: true, createdBy: { select: { firstName: true, lastName: true } } },
          },
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

  async getStages() {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'crm_sales_stages' },
    });
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_SALES_STAGES;
  }

  async updateStages(stages: any[], ctx: RequestContext) {
    const jsonStr = JSON.stringify(stages);
    await this.prisma.siteSetting.upsert({
      where: { key: 'crm_sales_stages' },
      create: {
        key: 'crm_sales_stages',
        group: 'sales',
        value: jsonStr,
        valueJson: { stages },
        description: 'Custom sales stages configured by administrator',
        isPublic: true,
      },
      update: {
        value: jsonStr,
        valueJson: { stages },
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.SITE_SETTING_UPDATED,
      entityType: 'SiteSetting',
      entityId: 'crm_sales_stages',
      after: { count: stages.length },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return stages;
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

      // Automation #7: Deal Won → Auto-Invoice & Quote Accepted
      if (updated.stage === DealStage.WON) {
        await this.salesAutomation.handleDealWon(id, ctx.userId ?? undefined).catch((err) => {
          // Non-blocking
        });
      }
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
