import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Prisma, AuditableAction, EmploymentStatus } from '@prisma/client';

@Injectable()
export class HrEmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateEmployeeDto, ctx: RequestContext) {
    const employee = await this.prisma.employee.create({
      data: {
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        department: dto.department,
        jobTitle: dto.jobTitle,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        baseSalary: dto.baseSalary,
        currency: dto.currency ?? 'GHS',
        employmentStatus: dto.employmentStatus ?? EmploymentStatus.ACTIVE,
        emergencyContact: dto.emergencyContact,
        notes: dto.notes,
      },
      include: {
        _count: { select: { performanceReviews: true, leaveRequests: true } },
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.EMPLOYEE_CREATED,
      entityType: 'Employee',
      entityId: employee.id,
      after: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return employee;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    employmentStatus?: string;
    department?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {};
    if (params.employmentStatus) {
      where.employmentStatus = params.employmentStatus as EmploymentStatus;
    }
    if (params.department) where.department = params.department;
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { employeeCode: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { performanceReviews: true, leaveRequests: true } },
        },
      }),
      this.prisma.employee.count({ where }),
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
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        performanceReviews: { orderBy: { reviewDate: 'desc' } },
        leaveRequests: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!employee)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Employee not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto, ctx: RequestContext) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Employee not found');

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        department: dto.department,
        jobTitle: dto.jobTitle,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        baseSalary: dto.baseSalary,
        currency: dto.currency,
        employmentStatus: dto.employmentStatus,
        emergencyContact: dto.emergencyContact,
        notes: dto.notes,
      },
      include: {
        _count: { select: { performanceReviews: true, leaveRequests: true } },
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.EMPLOYEE_UPDATED,
      entityType: 'Employee',
      entityId: id,
      before: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        employmentStatus: existing.employmentStatus,
      },
      after: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        employmentStatus: updated.employmentStatus,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Employee not found');

    await this.prisma.employee.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.EMPLOYEE_DELETED,
      entityType: 'Employee',
      entityId: id,
      before: { firstName: existing.firstName, lastName: existing.lastName },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
