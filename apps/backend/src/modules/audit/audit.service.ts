import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditableAction } from '@prisma/client';

export interface AuditEntry {
  userId?: string | null;
  action: AuditableAction;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit entry. Failures are logged but never propagate,
   * so auditing cannot take down business operations.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : undefined,
          after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : undefined,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', err as Error);
    }
  }

  async findAll(params: { page: number; limit: number; action?: string; userId?: string }) {
    const where = {
      ...(params.action ? { action: params.action as AuditableAction } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        id: i.id,
        userId: i.userId,
        userEmail: i.user?.email ?? null,
        action: i.action,
        entityType: i.entityType,
        entityId: i.entityId,
        before: i.before,
        after: i.after,
        ipAddress: i.ipAddress,
        userAgent: i.userAgent,
        requestId: i.requestId,
        createdAt: i.createdAt,
      })),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      paginated: true as const,
    };
  }
}
