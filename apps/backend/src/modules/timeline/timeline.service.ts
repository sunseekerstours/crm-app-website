import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';

export type TimelineEntityType = 'CUSTOMER' | 'LEAD' | 'DEAL';

export interface TimelineInput {
  entityType: TimelineEntityType;
  entityId: string;
  type: string;
  title: string;
  description?: string | null;
  actorId?: string | null;
  data?: unknown;
  occurredAt?: Date;
}

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Records a timeline event for Customer 360. Failures are logged, not thrown. */
  async record(input: TimelineInput): Promise<void> {
    try {
      await this.prisma.timelineEvent.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          type: input.type,
          title: input.title,
          description: input.description,
          actorId: input.actorId ?? null,
          data: input.data ? JSON.parse(JSON.stringify(input.data)) : undefined,
          occurredAt: input.occurredAt ?? new Date(),
        },
      });
    } catch (err) {
      this.logger.error('Failed to write timeline event', err as Error);
    }
  }
}
