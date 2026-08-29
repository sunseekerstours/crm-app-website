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
}
