import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { Prisma, AuditableAction, LeadStage } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async create(dto: CreateLeadDto, ctx: RequestContext) {
    const lead = await this.prisma.lead.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        source: dto.source,
        campaign: dto.campaign,
        destination: dto.destination,
        interestedTour: dto.interestedTour,
        estimatedValue: dto.estimatedValue,
        currency: dto.currency,
        leadScore: dto.leadScore,
        assignedUserId: dto.assignedUserId,
        stage: dto.stage ?? LeadStage.NEW,
        nextAction: dto.nextAction,
        lastContactAt: dto.lastContactAt ? new Date(dto.lastContactAt) : undefined,
        tags: dto.tags ?? [],
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAD_CREATED,
      entityType: 'Lead',
      entityId: lead.id,
      after: { email: lead.email, source: lead.source, stage: lead.stage },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: 'LEAD',
      entityId: lead.id,
      type: 'lead.created',
      title: 'Lead created',
      description: `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim(),
      actorId: ctx.userId,
    });

    return lead;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    stage?: string;
    source?: string;
  }) {
    const where: Prisma.LeadWhereInput = {};
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
      ];
    }
    if (params.stage) where.stage = params.stage as LeadStage;
    if (params.source) where.source = params.source as any;

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
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
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        deals: { select: { id: true, name: true, stage: true } },
      },
    });
    if (!lead) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found');
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, ctx: RequestContext) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        source: dto.source,
        campaign: dto.campaign,
        destination: dto.destination,
        interestedTour: dto.interestedTour,
        estimatedValue: dto.estimatedValue,
        currency: dto.currency,
        leadScore: dto.leadScore,
        assignedUserId: dto.assignedUserId,
        stage: dto.stage,
        nextAction: dto.nextAction,
        lastContactAt: dto.lastContactAt ? new Date(dto.lastContactAt) : undefined,
        tags: dto.tags,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAD_UPDATED,
      entityType: 'Lead',
      entityId: id,
      before: { stage: existing.stage },
      after: { stage: updated.stage },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    // Record a stage-change timeline event when the stage actually changed.
    if (existing.stage !== updated.stage) {
      await this.timeline.record({
        entityType: 'LEAD',
        entityId: id,
        type: 'lead.stage_changed',
        title: `Stage changed to ${updated.stage}`,
        description: `${existing.stage} → ${updated.stage}`,
        actorId: ctx.userId,
        data: { from: existing.stage, to: updated.stage },
      });
    } else {
      await this.timeline.record({
        entityType: 'LEAD',
        entityId: id,
        type: 'lead.updated',
        title: 'Lead updated',
        actorId: ctx.userId,
      });
    }

    return updated;
  }

  /**
   * Converts a lead into a Customer, linking the two while retaining the lead's
   * historical record (PRD §28-133: Lead != Customer).
   */
  async convert(id: string, ctx: RequestContext) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found');

    if (lead.customerId) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'This lead is already linked to a customer',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Reuse an existing customer by email if present, else create one.
      let customer = lead.email
        ? await tx.customer.findFirst({ where: { email: lead.email } })
        : null;

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            firstName: lead.firstName ?? 'Unknown',
            lastName: lead.lastName ?? 'Lead',
            email: lead.email,
            phone: lead.phone,
            whatsapp: lead.whatsapp,
            leadSource: lead.source,
          },
        });
      }

      const updatedLead = await tx.lead.update({
        where: { id },
        data: { customerId: customer.id, stage: LeadStage.WON },
      });

      return { customer, lead: updatedLead };
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAD_CONVERTED,
      entityType: 'Lead',
      entityId: id,
      after: { customerId: result.customer.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: 'LEAD',
      entityId: id,
      type: 'lead.converted',
      title: 'Lead converted to customer',
      actorId: ctx.userId,
      data: { customerId: result.customer.id },
    });

    await this.timeline.record({
      entityType: 'CUSTOMER',
      entityId: result.customer.id,
      type: 'customer.created',
      title: 'Customer created from lead',
      actorId: ctx.userId,
      data: { leadId: id },
    });

    return { customerId: result.customer.id, leadId: id };
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Lead not found');

    await this.prisma.lead.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAD_DELETED,
      entityType: 'Lead',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
