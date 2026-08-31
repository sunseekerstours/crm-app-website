import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import {
  ApiNotFoundException,
  ApiBadRequestException,
  ErrorCode,
} from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { Prisma, AuditableAction, LeaveStatus } from '@prisma/client';

@Injectable()
export class HrLeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateLeaveDto, ctx: RequestContext) {
    await this.assertEmployeeExists(dto.employeeId);
    this.assertValidDates(dto.startDate, dto.endDate);

    const leave = await this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAVE_CREATED,
      entityType: 'LeaveRequest',
      entityId: leave.id,
      after: {
        employeeId: leave.employeeId,
        leaveType: leave.leaveType,
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return leave;
  }

  async findAll(params: {
    page: number;
    limit: number;
    employeeId?: string;
    status?: string;
  }) {
    const where: Prisma.LeaveRequestWhereInput = {};
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status as LeaveStatus;

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.leaveRequest.count({ where }),
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
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!leave)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Leave request not found');
    return leave;
  }

  async update(id: string, dto: UpdateLeaveDto, ctx: RequestContext) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Leave request not found');

    if (dto.employeeId && dto.employeeId !== existing.employeeId) {
      await this.assertEmployeeExists(dto.employeeId);
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    this.assertValidDates(startDate, endDate);

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        reason: dto.reason,
        status: existing.status,
        approvedById: existing.approvedById,
        approvedAt: existing.approvedAt,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAVE_UPDATED,
      entityType: 'LeaveRequest',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async approve(id: string, dto: ApproveLeaveDto, ctx: RequestContext) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Leave request not found');

    const approved =
      dto.status === LeaveStatus.APPROVED || dto.status === LeaveStatus.REJECTED;

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: dto.status,
        approvedById: dto.approvedBy ?? ctx.userId ?? null,
        approvedAt: approved ? new Date() : null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAVE_APPROVED,
      entityType: 'LeaveRequest',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Leave request not found');

    await this.prisma.leaveRequest.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.LEAVE_DELETED,
      entityType: 'LeaveRequest',
      entityId: id,
      before: { status: existing.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  private assertValidDates(start: string | Date, end: string | Date) {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    if (endDate < startDate) {
      throw new ApiBadRequestException(
        ErrorCode.BAD_REQUEST,
        'End date cannot be before start date',
      );
    }
  }

  private async assertEmployeeExists(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new ApiBadRequestException(ErrorCode.BAD_REQUEST, 'Associated employee not found');
    }
  }
}
