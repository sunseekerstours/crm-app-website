import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AuditableAction, TaskPriority, TaskStatus } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  tag?: string;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async create(dto: CreateCustomerDto, ctx: RequestContext) {
    const customer = await this.prisma.customer.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        nationality: dto.nationality,
        country: dto.country,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        preferredLanguage: dto.preferredLanguage,
        preferredCommunication: dto.preferredCommunication,
        leadSource: dto.leadSource,
        status: dto.status,
        assignedStaffId: dto.assignedStaffId,
        companyId: dto.companyId,
        tags: dto.tags ?? [],
        products: dto.productIds?.length
          ? { create: dto.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
    });

    if (dto.linkedLeadId) {
      await this.prisma.lead.updateMany({
        where: { id: dto.linkedLeadId, customerId: null },
        data: { customerId: customer.id },
      });
    }
    if (dto.linkedDealId) {
      await this.prisma.deal.updateMany({
        where: { id: dto.linkedDealId, customerId: null },
        data: { customerId: customer.id },
      });
    }

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CUSTOMER_CREATED,
      entityType: 'Customer',
      entityId: customer.id,
      after: { email: customer.email, name: `${customer.firstName} ${customer.lastName}` },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: 'CUSTOMER',
      entityId: customer.id,
      type: 'customer.created',
      title: 'Customer created',
      description: `${customer.firstName} ${customer.lastName}`,
      actorId: ctx.userId,
    });

    // Optional initial Note on Customer
    if (dto.notes?.trim()) {
      await this.prisma.note.create({
        data: {
          content: dto.notes.trim(),
          customerId: customer.id,
          createdById: ctx.userId ?? undefined,
        },
      });

      await this.timeline.record({
        entityType: 'CUSTOMER',
        entityId: customer.id,
        type: 'customer.note_added',
        title: 'Initial note added',
        description: dto.notes.trim().slice(0, 150),
        actorId: ctx.userId,
      });
    }

    // Optional follow-up reminder Task
    if (dto.followUpReminderDate) {
      const dueDate = new Date(dto.followUpReminderDate);
      if (!isNaN(dueDate.getTime())) {
        const priority = dto.followUpReminderPriority && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(dto.followUpReminderPriority)
          ? (dto.followUpReminderPriority as TaskPriority)
          : TaskPriority.HIGH;

        const reminderTitle = dto.followUpReminderTitle?.trim() || `Follow-up with ${customer.firstName} ${customer.lastName}`;

        await this.prisma.task.create({
          data: {
            title: reminderTitle,
            description: dto.notes ? `Customer Note: ${dto.notes.trim()}` : `Scheduled follow-up reminder for customer ${customer.firstName} ${customer.lastName}.`,
            dueDate,
            priority,
            status: TaskStatus.PENDING,
            customerId: customer.id,
            assignedToId: customer.assignedStaffId || ctx.userId || undefined,
            createdById: ctx.userId || undefined,
          },
        });

        await this.timeline.record({
          entityType: 'CUSTOMER',
          entityId: customer.id,
          type: 'customer.followup_scheduled',
          title: 'Follow-up scheduled',
          description: `${reminderTitle} due ${dueDate.toLocaleDateString()}`,
          actorId: ctx.userId,
        });
      }
    }

    return customer;
  }

  async findAll(params: ListParams) {
    const where = this.buildWhere(params);
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          products: { select: { product: { select: { id: true, name: true, category: true } } } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: items.map((c) => ({ ...c, products: (c.products ?? []).map((p) => p.product) })),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      paginated: true as const,
    };
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        leads: { select: { id: true, stage: true } },
        deals: { select: { id: true, name: true, stage: true } },
        products: { include: { product: { select: { id: true, name: true, category: true } } } },
      },
    });
    if (!customer) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Customer not found');
    }
    return {
      ...customer,
      products: (customer.products ?? []).map((p) => p.product),
    };
  }

  async update(id: string, dto: UpdateCustomerDto, ctx: RequestContext) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        nationality: dto.nationality,
        country: dto.country,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        preferredLanguage: dto.preferredLanguage,
        preferredCommunication: dto.preferredCommunication,
        leadSource: dto.leadSource,
        status: dto.status,
        assignedStaffId: dto.assignedStaffId,
        companyId: dto.companyId,
        tags: dto.tags,
        products: dto.productIds
          ? { deleteMany: {}, create: dto.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
    });

    if (dto.linkedLeadId) {
      await this.prisma.lead.updateMany({
        where: { id: dto.linkedLeadId, customerId: null },
        data: { customerId: id },
      });
    }
    if (dto.linkedDealId) {
      await this.prisma.deal.updateMany({
        where: { id: dto.linkedDealId, customerId: null },
        data: { customerId: id },
      });
    }

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CUSTOMER_UPDATED,
      entityType: 'Customer',
      entityId: id,
      before: { status: existing.status, name: `${existing.firstName} ${existing.lastName}` },
      after: { status: updated.status, name: `${updated.firstName} ${updated.lastName}` },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.timeline.record({
      entityType: 'CUSTOMER',
      entityId: id,
      type: 'customer.updated',
      title: 'Customer updated',
      actorId: ctx.userId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Customer not found');
    }
    await this.prisma.customer.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CUSTOMER_DELETED,
      entityType: 'Customer',
      entityId: id,
      before: { email: existing.email },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  async getTags(): Promise<string[]> {
    const customers = await this.prisma.customer.findMany({
      select: { tags: true },
    });
    const set = new Set<string>();
    for (const c of customers) {
      if (Array.isArray(c.tags)) {
        for (const t of c.tags) {
          if (t && t.trim()) set.add(t.trim());
        }
      }
    }
    return Array.from(set).sort();
  }

  private buildWhere(params: ListParams) {
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
      ];
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.tag) {
      where.tags = { has: params.tag };
    }
    return where;
  }
}
