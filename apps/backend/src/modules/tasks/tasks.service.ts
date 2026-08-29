import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskListQueryDto } from './dto/task-list-query.dto';
import { Prisma, AuditableAction, TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly timeline: TimelineService,
  ) {}

  async create(dto: CreateTaskDto, ctx: RequestContext) {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? TaskStatus.PENDING,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId,
        createdById: ctx.userId,
        customerId: dto.customerId,
        leadId: dto.leadId,
        dealId: dto.dealId,
        sortOrder: dto.sortOrder,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TASK_CREATED,
      entityType: 'Task',
      entityId: task.id,
      after: { title: task.title, status: task.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    const timelineEntity = dto.customerId
      ? 'CUSTOMER'
      : dto.leadId
        ? 'LEAD'
        : dto.dealId
          ? 'DEAL'
          : null;
    if (timelineEntity) {
      await this.timeline.record({
        entityType: timelineEntity,
        entityId: dto.customerId ?? dto.leadId ?? dto.dealId!,
        type: 'task.created',
        title: `Task created: ${task.title}`,
        actorId: ctx.userId,
        data: { taskId: task.id },
      });
    }

    return task;
  }

  async findAll(params: TaskListQueryDto) {
    const where: Prisma.TaskWhereInput = {};
    if (params.status) where.status = params.status as TaskStatus;
    if (params.priority) where.priority = params.priority;
    if (params.assignedToId) where.assignedToId = params.assignedToId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.leadId) where.leadId = params.leadId;
    if (params.dealId) where.dealId = params.dealId;
    if (params.dueBefore) where.dueDate = { lt: new Date(params.dueBefore) };
    if (params.search) where.title = { contains: params.search, mode: 'insensitive' };

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      paginated: true as const,
    };
  }

  /** "My Day" view: tasks assigned to current user (open, due today or overdue). */
  async myDay(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const items = await this.prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: { not: TaskStatus.COMPLETED },
        OR: [{ dueDate: null }, { dueDate: { lte: endOfDay } }],
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, name: true } },
      },
    });
    return { items };
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Task not found');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, ctx: RequestContext) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Task not found');

    const data: Prisma.TaskUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      assignedToId: dto.assignedToId,
      customerId: dto.customerId,
      leadId: dto.leadId,
      dealId: dto.dealId,
      sortOrder: dto.sortOrder,
    };

    if (dto.status === TaskStatus.COMPLETED && existing.status !== TaskStatus.COMPLETED) {
      data.completedAt = new Date();
    } else if (dto.status && dto.status !== TaskStatus.COMPLETED) {
      data.completedAt = null;
    }

    const updated = await this.prisma.task.update({ where: { id }, data });

    const completed =
      existing.status !== TaskStatus.COMPLETED && updated.status === TaskStatus.COMPLETED;

    await this.audit.record({
      userId: ctx.userId,
      action: completed ? AuditableAction.TASK_COMPLETED : AuditableAction.TASK_UPDATED,
      entityType: 'Task',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    if (existing.status !== updated.status) {
      const linkedId = existing.customerId ?? existing.leadId ?? existing.dealId;
      if (linkedId) {
        await this.timeline.record({
          entityType: existing.customerId ? 'CUSTOMER' : existing.leadId ? 'LEAD' : 'DEAL',
          entityId: linkedId,
          type: completed ? 'task.completed' : 'task.status_changed',
          title: `Task "${updated.title}" ${completed ? 'completed' : `status → ${updated.status}`}`,
          actorId: ctx.userId,
          data: { taskId: id, from: existing.status, to: updated.status },
        });
      }
    }

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Task not found');

    await this.prisma.task.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.TASK_DELETED,
      entityType: 'Task',
      entityId: id,
      before: { title: existing.title },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
