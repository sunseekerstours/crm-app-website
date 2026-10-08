import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { MailService } from '@app/modules/mail/mail.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { AuditableAction, NotificationChannel, NotificationType, Prisma } from '@prisma/client';

export interface DispatchInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entity?: { type: string; id: string };
  data?: Prisma.InputJsonValue;
}

export interface NotificationListParams {
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

const DEFAULT_PREFS = { email: true, push: false, inApp: true } as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailService: MailService,
  ) {}

  /** Returns the effective preferences for a user (merged with defaults). */
  async getPrefs(userId: string) {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });
    const byType = new Map(rows.map((r) => [r.type, r]));
    const out: Record<string, { email: boolean; push: boolean; inApp: boolean }> = {};
    for (const t of Object.values(NotificationType)) {
      const row = byType.get(t);
      out[t] = row ? { email: row.email, push: row.push, inApp: row.inApp } : { ...DEFAULT_PREFS };
    }
    return out;
  }

  /** Upserts preferences for one (or all, if type omitted) notification types. */
  async updatePrefs(userId: string, dto: UpdatePrefsShape) {
    const types = dto.type ? [dto.type] : Object.values(NotificationType);
    const current = await this.getPrefs(userId);
    await this.prisma.$transaction(
      types.map((type) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_type: { userId, type } },
          create: {
            userId,
            type,
            email: dto.email ?? current[type].email,
            push: dto.push ?? current[type].push,
            inApp: dto.inApp ?? current[type].inApp,
          },
          update: {
            email: dto.email ?? current[type].email,
            push: dto.push ?? current[type].push,
            inApp: dto.inApp ?? current[type].inApp,
          },
        }),
      ),
    );
    return this.getPrefs(userId);
  }

  /**
   * Dispatches a notification across the channels the user has enabled.
   * In-app notifications are persisted; email/push are stubbed (logged) until
   * external providers are configured.
   */
  async dispatch(input: DispatchInput): Promise<void> {
    const prefs = await this.getPrefs(input.userId);
    const effective = prefs[input.type] ?? { ...DEFAULT_PREFS };

    const channels: NotificationChannel[] = [];
    if (effective.inApp) channels.push(NotificationChannel.IN_APP);
    if (effective.email) channels.push(NotificationChannel.EMAIL);
    if (effective.push) channels.push(NotificationChannel.PUSH);

    const entity = input.entity
      ? { entityType: input.entity.type, entityId: input.entity.id }
      : undefined;

    for (const channel of channels) {
      if (channel === NotificationChannel.IN_APP) {
        await this.prisma.notification.create({
          data: {
            userId: input.userId,
            type: input.type,
            channel,
            title: input.title,
            message: input.message,
            data: entity as Prisma.InputJsonValue,
          },
        });
      } else if (channel === NotificationChannel.EMAIL) {
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: input.userId },
            select: { email: true, firstName: true },
          });
          if (user?.email) {
            await this.mailService.sendNotificationEmail(user.email, input.title, input.message);
          } else {
            this.logger.warn(`Could not send email notification: user ${input.userId} has no email`);
          }
        } catch (err: any) {
          this.logger.error(`Error sending notification email: ${err?.message}`);
        }
      } else {
        this.logger.log(`[${channel}] -> ${input.userId} (${input.type}): ${input.title}`);
      }
    }

    await this.audit.record({
      action: AuditableAction.NOTIFICATION_CREATED,
      entityType: 'Notification',
      entityId: input.userId,
      after: { type: input.type, channels },
    });
  }

  /**
   * Broadcasts a notification to multiple active users (e.g. all managers, finance, or sales staff).
   */
  async broadcast(input: {
    type: NotificationType;
    title: string;
    message: string;
    roles?: string[];
    excludeUserIds?: string[];
    entity?: { type: string; id: string };
    data?: Prisma.InputJsonValue;
  }): Promise<number> {
    let userIds: string[] = [];
    if (input.roles && input.roles.length > 0) {
      const users = await this.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          roles: { some: { role: { name: { in: input.roles } } } },
        },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else {
      const users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    if (input.excludeUserIds?.length) {
      userIds = userIds.filter((id) => !input.excludeUserIds!.includes(id));
    }

    let sent = 0;
    for (const uid of userIds) {
      try {
        await this.dispatch({
          userId: uid,
          type: input.type,
          title: input.title,
          message: input.message,
          entity: input.entity,
          data: input.data,
        });
        sent++;
      } catch (err: any) {
        this.logger.debug(`Broadcast to user ${uid} skipped: ${err?.message}`);
      }
    }
    return sent;
  }

  /** True when a reminder for the same entity/type to the user already exists. */
  async hasOpenReminder(
    userId: string,
    type: NotificationType,
    entity: { type: string; id: string },
  ): Promise<boolean> {
    const latest = await this.prisma.notification.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    if (!latest?.data) return false;
    const data = latest.data as { entityType?: string; entityId?: string };
    return data.entityType === entity.type && data.entityId === entity.id;
  }

  async listForUser(userId: string, params: NotificationListParams) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (params.unreadOnly) where.readAt = null;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
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

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Notification not found');
    }
    if (!existing.readAt) {
      await this.prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }
}

export interface UpdatePrefsShape {
  type?: NotificationType;
  email?: boolean;
  push?: boolean;
  inApp?: boolean;
}
