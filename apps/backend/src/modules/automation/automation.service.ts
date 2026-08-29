import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { NotificationsService } from '@app/modules/notifications/notifications.service';
import {
  AuditableAction,
  BookingStatus,
  DepartureStatus,
  InvoiceStatus,
  LeadStage,
  NotificationType,
  UserStatus,
} from '@prisma/client';

const OPERATIONS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONS_STAFF'];
const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'];

export interface RunSummary {
  departureReminders: number;
  invoiceOverdue: number;
  paymentReminders: number;
  leadFollowUps: number;
  checklistTodos: number;
}

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('automation.enabled')) {
      this.logger.log('Automation scheduler disabled (AUTOMATION_ENABLED != true)');
      return;
    }
    const interval = this.config.get<number>('automation.intervalMs') ?? 3600000;
    this.timer = setInterval(() => {
      this.run().catch((err) =>
        this.logger.error('Automated reminder sweep failed', (err as Error)?.stack),
      );
    }, interval);
    this.timer.unref?.();
    this.logger.log(`Automation scheduler enabled (every ${interval}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Runs the full reminder sweep and returns a summary of dispatched items. */
  async run(): Promise<RunSummary> {
    const now = new Date();
    const windowDays = this.config.getOrThrow<number>('automation.reminderWindowDays');
    const staleLeadDays = this.config.getOrThrow<number>('automation.staleLeadDays');

    const summary: RunSummary = {
      departureReminders: await this.remindDepartures(now, windowDays),
      invoiceOverdue: await this.remindInvoicesOverdue(now),
      paymentReminders: await this.remindBookingPayments(now, windowDays),
      leadFollowUps: await this.remindLeads(now, staleLeadDays),
      checklistTodos: await this.remindChecklists(now, windowDays),
    };

    this.logger.log(`Reminder sweep complete: ${JSON.stringify(summary)}`);
    await this.audit.record({
      action: AuditableAction.AUTOMATION_TRIGGERED,
      entityType: 'Automation',
      after: summary,
    });
    return summary;
  }

  // ---------------------------------------------------------------------------
  // Departure reminders (operations)
  // ---------------------------------------------------------------------------
  private async remindDepartures(now: Date, windowDays: number): Promise<number> {
    const end = this.addDays(now, windowDays);
    const departures = await this.prisma.departure.findMany({
      where: {
        status: DepartureStatus.SCHEDULED,
        startDate: { gte: now, lte: end },
      },
      include: { tour: { select: { id: true, name: true } } },
    });

    const recipients = await this.opsUsers();
    let count = 0;
    for (const d of departures) {
      const days = this.dayDiff(now, d.startDate);
      const title = `Departure in ${days} day${days === 1 ? '' : 's'}`;
      const message = `${d.tour.name} departs on ${d.startDate.toISOString().slice(0, 10)}.`;
      for (const uid of recipients) {
        if (
          await this.shouldDispatch(uid, NotificationType.DEPARTURE_REMINDER, 'DEPARTURE', d.id)
        ) {
          await this.notifications.dispatch({
            userId: uid,
            type: NotificationType.DEPARTURE_REMINDER,
            title,
            message,
            entity: { type: 'DEPARTURE', id: d.id },
          });
          count++;
        }
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Overdue invoices (finance)
  // ---------------------------------------------------------------------------
  private async remindInvoicesOverdue(now: Date): Promise<number> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        OR: [
          { status: InvoiceStatus.OVERDUE },
          {
            status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
            dueDate: { lt: now },
          },
        ],
      },
    });
    const recipients = await this.financeUsers();
    let count = 0;
    for (const inv of invoices) {
      const title = `Invoice overdue`;
      const message = `Invoice ${inv.invoiceNumber} is overdue (${Number(inv.amount ?? 0).toFixed(2)} ${inv.currency}).`;
      const targets = this.uniqueIds([...recipients, inv.createdById]);
      for (const uid of targets) {
        if (await this.shouldDispatch(uid, NotificationType.INVOICE_OVERDUE, 'INVOICE', inv.id)) {
          await this.notifications.dispatch({
            userId: uid,
            type: NotificationType.INVOICE_OVERDUE,
            title,
            message,
            entity: { type: 'INVOICE', id: inv.id },
          });
          count++;
        }
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Booking payment reminders (finance/agent) - upcoming due invoices
  // ---------------------------------------------------------------------------
  private async remindBookingPayments(now: Date, windowDays: number): Promise<number> {
    const end = this.addDays(now, windowDays);
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        invoices: {
          some: {
            status: {
              in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
            },
            dueDate: { gte: now, lte: end },
          },
        },
      },
      include: { invoices: true },
    });

    const recipients = await this.financeUsers();
    let count = 0;
    for (const b of bookings) {
      const due = b.invoices.find(
        (i) => i.status !== InvoiceStatus.PAID && i.dueDate && i.dueDate >= now && i.dueDate <= end,
      );
      if (!due) continue;
      const title = `Payment due soon`;
      const message = `Booking ${b.bookingNumber}: invoice ${due.invoiceNumber} (${Number(due.amount ?? 0).toFixed(2)} ${due.currency}) is due by ${due.dueDate!.toISOString().slice(0, 10)}.`;
      const targets = this.uniqueIds([...recipients, b.createdById]);
      for (const uid of targets) {
        if (await this.shouldDispatch(uid, NotificationType.PAYMENT_REMINDER, 'BOOKING', b.id)) {
          await this.notifications.dispatch({
            userId: uid,
            type: NotificationType.PAYMENT_REMINDER,
            title,
            message,
            entity: { type: 'BOOKING', id: b.id },
          });
          count++;
        }
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Stale lead follow-ups (assigned agent)
  // ---------------------------------------------------------------------------
  private async remindLeads(now: Date, staleLeadDays: number): Promise<number> {
    const cutoff = this.addDays(now, -staleLeadDays);
    const leads = await this.prisma.lead.findMany({
      where: {
        stage: { notIn: [LeadStage.WON, LeadStage.LOST] },
        OR: [{ lastContactAt: { lt: cutoff } }, { lastContactAt: null }],
      },
    });
    let count = 0;
    for (const l of leads) {
      if (!l.assignedUserId) continue;
      const title = `Lead needs follow-up`;
      const name = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || l.email || 'lead';
      const message = `${name} has not been contacted in ${staleLeadDays}+ days.`;
      if (
        await this.shouldDispatch(l.assignedUserId, NotificationType.LEAD_FOLLOW_UP, 'LEAD', l.id)
      ) {
        await this.notifications.dispatch({
          userId: l.assignedUserId,
          type: NotificationType.LEAD_FOLLOW_UP,
          title,
          message,
          entity: { type: 'LEAD', id: l.id },
        });
        count++;
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Incomplete required checklist items on upcoming departures
  // ---------------------------------------------------------------------------
  private async remindChecklists(now: Date, windowDays: number): Promise<number> {
    const end = this.addDays(now, windowDays);
    const departingIds = (
      await this.prisma.departure.findMany({
        where: {
          status: DepartureStatus.SCHEDULED,
          startDate: { gte: now, lte: end },
        },
        select: { id: true },
      })
    ).map((d) => d.id);

    if (departingIds.length === 0) return 0;

    const openItems = await this.prisma.checklistItem.findMany({
      where: {
        departureId: { in: departingIds },
        isRequired: true,
        isCompleted: false,
      },
      include: { departure: { include: { tour: { select: { name: true } } } } },
    });

    const recipients = await this.opsUsers();
    const byDeparture = new Map<string, typeof openItems>();
    for (const item of openItems) {
      if (!item.departureId) continue;
      const arr = byDeparture.get(item.departureId) ?? [];
      arr.push(item);
      byDeparture.set(item.departureId, arr);
    }

    let count = 0;
    for (const [depId, items] of byDeparture) {
      const first = items[0];
      const title = `Open checklist for ${first.departure!.tour.name}`;
      const message = `${items.length} required item(s) remain incomplete for the upcoming departure.`;
      for (const uid of recipients) {
        if (await this.shouldDispatch(uid, NotificationType.CHECKLIST_TODO, 'DEPARTURE', depId)) {
          await this.notifications.dispatch({
            userId: uid,
            type: NotificationType.CHECKLIST_TODO,
            title,
            message,
            entity: { type: 'DEPARTURE', id: depId },
          });
          count++;
        }
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private async shouldDispatch(
    userId: string,
    type: NotificationType,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    return !(await this.notifications.hasOpenReminder(userId, type, {
      type: entityType,
      id: entityId,
    }));
  }

  private async opsUsers(): Promise<string[]> {
    return this.usersForRoles(OPERATIONS_ROLES);
  }

  private async financeUsers(): Promise<string[]> {
    return this.usersForRoles(FINANCE_ROLES);
  }

  private async usersForRoles(roleNames: string[]): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        roles: { some: { role: { name: { in: roleNames } } } },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private dayDiff(a: Date, b: Date): number {
    return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86400000));
  }

  private uniqueIds(ids: Array<string | null | undefined>): string[] {
    return Array.from(new Set(ids.filter((x): x is string => Boolean(x))));
  }
}
