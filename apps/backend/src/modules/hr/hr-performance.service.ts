import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ApiBadRequestException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';
import { Prisma, AuditableAction } from '@prisma/client';

@Injectable()
export class HrPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePerformanceDto, ctx: RequestContext) {
    await this.assertEmployeeExists(dto.employeeId);

    const performance = await this.prisma.performanceReview.create({
      data: {
        employeeId: dto.employeeId,
        reviewDate: new Date(dto.reviewDate),
        rating: dto.rating,
        score: dto.score,
        goals: dto.goals,
        achievements: dto.achievements,
        strengths: dto.strengths,
        improvements: dto.improvements,
        feedback: dto.feedback,
        reviewedById: dto.reviewedById,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PERFORMANCE_CREATED,
      entityType: 'PerformanceReview',
      entityId: performance.id,
      after: {
        employeeId: performance.employeeId,
        rating: performance.rating,
        reviewDate: performance.reviewDate.toISOString(),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return performance;
  }

  async findAll(params: {
    page: number;
    limit: number;
    employeeId?: string;
  }) {
    const where: Prisma.PerformanceReviewWhereInput = {};
    if (params.employeeId) where.employeeId = params.employeeId;

    const [items, total] = await Promise.all([
      this.prisma.performanceReview.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { reviewDate: 'desc' },
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.performanceReview.count({ where }),
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
    const performance = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!performance)
      throw new ApiNotFoundException(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Performance review not found',
      );
    return performance;
  }

  async update(id: string, dto: UpdatePerformanceDto, ctx: RequestContext) {
    const existing = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Performance review not found',
      );

    if (dto.employeeId && dto.employeeId !== existing.employeeId) {
      await this.assertEmployeeExists(dto.employeeId);
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        employeeId: dto.employeeId,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        rating: dto.rating,
        score: dto.score,
        goals: dto.goals,
        achievements: dto.achievements,
        strengths: dto.strengths,
        improvements: dto.improvements,
        feedback: dto.feedback,
        reviewedById: dto.reviewedById,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PERFORMANCE_UPDATED,
      entityType: 'PerformanceReview',
      entityId: id,
      before: { rating: existing.rating, reviewDate: existing.reviewDate.toISOString() },
      after: { rating: updated.rating, reviewDate: updated.reviewDate.toISOString() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!existing)
      throw new ApiNotFoundException(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Performance review not found',
      );

    await this.prisma.performanceReview.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PERFORMANCE_DELETED,
      entityType: 'PerformanceReview',
      entityId: id,
      before: { rating: existing.rating },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  private async assertEmployeeExists(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new ApiBadRequestException(
        ErrorCode.BAD_REQUEST,
        'Associated employee not found',
      );
    }
  }
}
