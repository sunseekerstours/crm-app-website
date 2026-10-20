import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { NotificationsService } from '@app/modules/notifications/notifications.service';
import { TelegramService } from '@app/modules/telegram/telegram.service';
import { RequestContext } from '@app/common/request-context';
import { ApiBadRequestException, ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { SaveWeeklyReportDto } from './dto/save-weekly-report.dto';
import { WeeklyReportQueryDto } from './dto/weekly-report-query.dto';
import { TargetSettingsDto } from './dto/target-settings.dto';
import {
  ActivityType,
  AuditableAction,
  DealStage,
  NotificationType,
  PaymentStatus,
  Prisma,
  TaskStatus,
  WeeklyReportStatus,
} from '@prisma/client';

const TARGET_SETTINGS_KEY = 'sales_weekly_targets_default';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Helper to compute start & end of week for a given reference date
   * Defaults to Monday 00:00:00 to Sunday 23:59:59.999
   */
  private getWeekBounds(referenceDate?: string | Date): { start: Date; end: Date; weekLabel: string } {
    const d = referenceDate ? new Date(referenceDate) : new Date();
    // Monday as start of week (day 1), Sunday as end (day 7)
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days

    const start = new Date(d);
    start.setDate(d.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const weekLabel = `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;

    return { start, end, weekLabel };
  }

  /**
   * Get default targets that can change over time
   */
  async getTargetSettings(): Promise<TargetSettingsDto> {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: TARGET_SETTINGS_KEY },
    });
    if (setting && setting.valueJson) {
      return setting.valueJson as TargetSettingsDto;
    }
    // Default fallback benchmarks (flexible & editable)
    return {
      leads: 10,
      meetings: 5,
      proposals: 3,
      dealsClosed: 2,
      revenueGhc: 25000,
    };
  }

  /**
   * Update ongoing default targets
   */
  async updateTargetSettings(dto: TargetSettingsDto, ctx: RequestContext): Promise<TargetSettingsDto> {
    await this.prisma.siteSetting.upsert({
      where: { key: TARGET_SETTINGS_KEY },
      update: {
        valueJson: dto as any,
        group: 'sales_reports',
        description: 'Default Weekly Sales Targets for Reps',
      },
      create: {
        key: TARGET_SETTINGS_KEY,
        valueJson: dto as any,
        group: 'sales_reports',
        description: 'Default Weekly Sales Targets for Reps',
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.SITE_SETTING_UPDATED,
      entityType: 'SiteSetting',
      entityId: TARGET_SETTINGS_KEY,
      after: dto as any,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return dto;
  }

  /**
   * Preview & auto-populate a weekly sales report from live CRM data
   */
  async previewWeeklyReport(query: WeeklyReportQueryDto, ctx: RequestContext) {
    const targetUserId = query.userId || ctx.userId;
    if (!targetUserId) {
      throw new ApiBadRequestException(ErrorCode.VALIDATION_ERROR, 'User ID is required');
    }

    const { start, end, weekLabel } = this.getWeekBounds(query.weekOf || query.startDate);

    // 1. Fetch User and Manager Info
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) {
      throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const repName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    // Find manager (first active user with MANAGER role or default)
    const managerUser = await this.prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { name: { in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'] } } } },
      },
      select: { firstName: true, lastName: true, email: true },
    });
    const defaultManagerName = managerUser
      ? `${managerUser.firstName || ''} ${managerUser.lastName || ''}`.trim() || managerUser.email
      : 'Sales Director';

    // 2. Check if a report for this user and week already exists in database
    const existingReport = await this.prisma.weeklySalesReport.findFirst({
      where: {
        userId: targetUserId,
        weekStartDate: { gte: new Date(start.getTime() - 24 * 3600 * 1000), lte: new Date(start.getTime() + 24 * 3600 * 1000) },
      },
    });

    // 3. Aggregate Section 1: Weekly Activity Summary
    // A. Activities: Calls / Emails / Visits
    const activities = await this.prisma.activity.findMany({
      where: {
        createdById: targetUserId,
        occurredAt: { gte: start, lte: end },
      },
      select: { type: true },
    });

    let callsCount = 0;
    let emailsCount = 0;
    let visitsCount = 0;
    let meetingsCount = 0;

    for (const a of activities) {
      if (a.type === ActivityType.CALL) callsCount++;
      else if (a.type === ActivityType.EMAIL) emailsCount++;
      else if (a.type === ActivityType.MEETING) {
        visitsCount++;
        meetingsCount++;
      }
    }

    // B. New Prospects Engaged (Leads assigned or contacted in week)
    const newProspectsCount = await this.prisma.lead.count({
      where: {
        assignedUserId: targetUserId,
        createdAt: { gte: start, lte: end },
      },
    });

    // C. Proposals Submitted (Quotes sent or deals in PROPOSAL stage)
    const proposalsCount = await this.prisma.quote.count({
      where: {
        createdById: targetUserId,
        createdAt: { gte: start, lte: end },
      },
    });

    // D. Follow-Ups Completed (Tasks completed in 48-72h range or completed in week)
    const followUpsCount = await this.prisma.task.count({
      where: {
        assignedToId: targetUserId,
        status: TaskStatus.COMPLETED,
        completedAt: { gte: start, lte: end },
      },
    });

    // E. Deals Closed (Won in week)
    const closedDeals = await this.prisma.deal.findMany({
      where: {
        salespersonId: targetUserId,
        stage: DealStage.WON,
        updatedAt: { gte: start, lte: end },
      },
      select: { id: true, name: true, value: true, currency: true },
    });
    const dealsClosedCount = closedDeals.length;

    // F. Revenue Collected (GHC) from payments recorded or linked to deals
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: start, lte: end },
        OR: [
          { recordedById: targetUserId },
          { deal: { salespersonId: targetUserId } },
          { booking: { createdById: targetUserId } },
        ],
      },
      select: { amount: true, currency: true },
    });

    const revenueCollectedGhc = payments.reduce((sum, p) => {
      const amt = p.amount ? Number(p.amount) : 0;
      // If payment is recorded in USD, convert approximately at GHS 15.5 or keep GHS
      const valGhc = p.currency === 'USD' ? amt * 15.5 : amt;
      return sum + valGhc;
    }, 0);

    const autoActivitySummary = {
      calls: callsCount,
      emails: emailsCount,
      visits: visitsCount,
      callsEmailsVisitsFormatted: `${callsCount} / ${emailsCount} / ${visitsCount}`,
      newProspectsEngaged: newProspectsCount,
      meetingsHeld: meetingsCount,
      proposalsSubmitted: proposalsCount,
      followUpsCompleted: followUpsCount,
      dealsClosed: dealsClosedCount,
      revenueCollectedGhc: Math.round(revenueCollectedGhc),
    };

    // 4. Section 2: Weekly KPIs (Targets & Actuals)
    const targets = await this.getTargetSettings();
    const autoKpis = [
      {
        key: 'leads',
        label: 'Leads Generated',
        target: targets.leads || '',
        actual: newProspectsCount,
      },
      {
        key: 'meetings',
        label: 'Meetings Held',
        target: targets.meetings || '',
        actual: meetingsCount,
      },
      {
        key: 'proposals',
        label: 'Proposals Submitted',
        target: targets.proposals || '',
        actual: proposalsCount,
      },
      {
        key: 'dealsClosed',
        label: 'Deals Closed',
        target: targets.dealsClosed || '',
        actual: dealsClosedCount,
      },
      {
        key: 'revenueGhc',
        label: 'Revenue Generated (GHC)',
        target: targets.revenueGhc ? Number(targets.revenueGhc).toLocaleString() : '',
        actual: Math.round(revenueCollectedGhc),
      },
    ];

    // 5. Section 3: Active Pipeline Deals
    const activeDeals = await this.prisma.deal.findMany({
      where: {
        salespersonId: targetUserId,
        stage: { notIn: [DealStage.WON, DealStage.LOST] },
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        tasks: {
          where: { status: TaskStatus.PENDING },
          orderBy: { dueDate: 'asc' },
          take: 1,
          select: { title: true, dueDate: true },
        },
      },
      orderBy: { value: 'desc' },
      take: 10,
    });

    const pipelineDeals = activeDeals.map((d) => {
      const clientName = d.customer ? `${d.customer.firstName} ${d.customer.lastName}`.trim() : d.name;
      const nextTask = d.tasks[0]?.title || d.notes || 'Follow-up with client';
      const valGhc = d.currency === 'USD' ? (Number(d.value) || 0) * 15.5 : Number(d.value) || 0;
      return {
        id: d.id,
        clientOpportunity: clientName,
        dealName: d.name,
        stage: d.stage,
        nextAction: nextTask,
        estValueGhc: Math.round(valGhc),
      };
    });

    // 6. Section 4: Wins & Blockers
    const autoWins = closedDeals.map(
      (d) => `Won deal: ${d.name} (${Number(d.value || 0).toLocaleString()} ${d.currency || 'GHS'})`,
    );
    if (autoWins.length === 0 && revenueCollectedGhc > 0) {
      autoWins.push(`Collected GHC ${Math.round(revenueCollectedGhc).toLocaleString()} in customer tour payments`);
    }

    const autoBlockers: string[] = [];

    // 7. Section 5: Next Week's Commitments (Upcoming tasks due next week)
    const nextWeekStart = new Date(end.getTime() + 1);
    const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 24 * 3600 * 1000);

    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        assignedToId: targetUserId,
        status: TaskStatus.PENDING,
        dueDate: { gte: nextWeekStart, lte: nextWeekEnd },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    const autoCommitments = upcomingTasks.map((t) => ({
      commitment: t.title,
      owner: repName,
      dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
    }));

    // If existing report exists, merge saved user notes
    return {
      isSaved: Boolean(existingReport),
      id: existingReport?.id || null,
      userId: targetUserId,
      repName,
      managerName: existingReport?.managerName || defaultManagerName,
      weekStartDate: start.toISOString(),
      weekEndDate: end.toISOString(),
      weekLabel,
      status: existingReport?.status || WeeklyReportStatus.DRAFT,
      activitySummary: existingReport?.activitySummary && Object.keys(existingReport.activitySummary as any).length > 0
        ? existingReport.activitySummary
        : autoActivitySummary,
      kpis: existingReport?.kpis && Array.isArray(existingReport.kpis) && existingReport.kpis.length > 0
        ? existingReport.kpis
        : autoKpis,
      pipelineDeals: existingReport?.pipelineDeals && Array.isArray(existingReport.pipelineDeals) && existingReport.pipelineDeals.length > 0
        ? existingReport.pipelineDeals
        : pipelineDeals,
      wins: existingReport?.wins && existingReport.wins.length > 0 ? existingReport.wins : autoWins,
      blockers: existingReport?.blockers && existingReport.blockers.length > 0 ? existingReport.blockers : autoBlockers,
      keyLearning: existingReport?.keyLearning || '',
      commitments: existingReport?.commitments && Array.isArray(existingReport.commitments) && existingReport.commitments.length > 0
        ? existingReport.commitments
        : autoCommitments,
      overallPerformance: existingReport?.overallPerformance || 'On Track',
      keyWinHighlight: existingReport?.keyWinHighlight || (autoWins[0] || ''),
      supportNeeded: existingReport?.supportNeeded || '',
      projectedRevenueGhc: existingReport?.projectedRevenueGhc
        ? Number(existingReport.projectedRevenueGhc)
        : Math.round(revenueCollectedGhc * 1.1),
      onTrackStatus: existingReport?.onTrackStatus || 'On Track',
      repSignedAt: existingReport?.repSignedAt || null,
      reviewedById: existingReport?.reviewedById || null,
      reviewedAt: existingReport?.reviewedAt || null,
      managerNotes: existingReport?.managerNotes || '',
    };
  }

  /**
   * Save or update a weekly sales report
   */
  async saveWeeklyReport(dto: SaveWeeklyReportDto, ctx: RequestContext) {
    const targetUserId = dto.userId || ctx.userId;
    if (!targetUserId) {
      throw new ApiBadRequestException(ErrorCode.VALIDATION_ERROR, 'User ID is required');
    }

    const weekStartDate = new Date(dto.weekStartDate);
    const weekEndDate = new Date(dto.weekEndDate);

    // Find existing by ID or user + week bounds
    let existing = dto.id
      ? await this.prisma.weeklySalesReport.findUnique({ where: { id: dto.id } })
      : await this.prisma.weeklySalesReport.findFirst({
          where: {
            userId: targetUserId,
            weekStartDate: { gte: new Date(weekStartDate.getTime() - 24 * 3600 * 1000), lte: new Date(weekStartDate.getTime() + 24 * 3600 * 1000) },
          },
        });

    let report;
    if (existing) {
      report = await this.prisma.weeklySalesReport.update({
        where: { id: existing.id },
        data: {
          status: dto.status || existing.status,
          managerName: dto.managerName || existing.managerName,
          activitySummary: dto.activitySummary || (existing.activitySummary as any),
          kpis: dto.kpis || (existing.kpis as any),
          pipelineDeals: dto.pipelineDeals || (existing.pipelineDeals as any),
          wins: dto.wins !== undefined ? dto.wins : existing.wins,
          blockers: dto.blockers !== undefined ? dto.blockers : existing.blockers,
          keyLearning: dto.keyLearning !== undefined ? dto.keyLearning : existing.keyLearning,
          commitments: dto.commitments || (existing.commitments as any),
          overallPerformance: dto.overallPerformance || existing.overallPerformance,
          keyWinHighlight: dto.keyWinHighlight || existing.keyWinHighlight,
          supportNeeded: dto.supportNeeded || existing.supportNeeded,
          projectedRevenueGhc: dto.projectedRevenueGhc !== undefined ? dto.projectedRevenueGhc : existing.projectedRevenueGhc,
          onTrackStatus: dto.onTrackStatus || existing.onTrackStatus,
          repSignedAt: dto.repSignedAt ? new Date(dto.repSignedAt) : existing.repSignedAt,
          managerNotes: dto.managerNotes || existing.managerNotes,
        },
      });

      await this.audit.record({
        userId: ctx.userId,
        action: AuditableAction.WEEKLY_REPORT_UPDATED,
        entityType: 'WeeklySalesReport',
        entityId: report.id,
        after: { status: report.status, weekStartDate: report.weekStartDate },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
      });
    } else {
      report = await this.prisma.weeklySalesReport.create({
        data: {
          userId: targetUserId,
          weekStartDate,
          weekEndDate,
          status: dto.status || WeeklyReportStatus.DRAFT,
          managerName: dto.managerName,
          activitySummary: dto.activitySummary || {},
          kpis: dto.kpis || [],
          pipelineDeals: dto.pipelineDeals || [],
          wins: dto.wins || [],
          blockers: dto.blockers || [],
          keyLearning: dto.keyLearning,
          commitments: dto.commitments || [],
          overallPerformance: dto.overallPerformance,
          keyWinHighlight: dto.keyWinHighlight,
          supportNeeded: dto.supportNeeded,
          projectedRevenueGhc: dto.projectedRevenueGhc,
          onTrackStatus: dto.onTrackStatus,
          repSignedAt: dto.repSignedAt ? new Date(dto.repSignedAt) : new Date(),
          managerNotes: dto.managerNotes,
        },
      });

      await this.audit.record({
        userId: ctx.userId,
        action: AuditableAction.WEEKLY_REPORT_CREATED,
        entityType: 'WeeklySalesReport',
        entityId: report.id,
        after: { status: report.status, weekStartDate: report.weekStartDate },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
      });
    }

    // If report was submitted, notify managers
    if (dto.status === WeeklyReportStatus.SUBMITTED) {
      const user = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { firstName: true, lastName: true, email: true },
      });
      const repName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Sales Rep';

      await this.notifications.broadcast({
        type: NotificationType.SYSTEM,
        title: '📊 Weekly Sales Report Submitted',
        message: `${repName} has submitted their Weekly Sales Performance Report for review.`,
        entity: { type: 'WEEKLY_REPORT', id: report.id },
      }).catch(() => {});

      await this.telegram.sendAlert(
        `📊 <b>WEEKLY SALES REPORT SUBMITTED</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Rep:</b> ${repName}\n` +
        `📅 <b>Week:</b> ${new Date(report.weekStartDate).toLocaleDateString()} – ${new Date(report.weekEndDate).toLocaleDateString()}\n` +
        `🎯 <b>Status:</b> ${report.onTrackStatus || 'Submitted'}\n` +
        `💰 <b>Projected Next Week:</b> GHC ${Number(report.projectedRevenueGhc || 0).toLocaleString()}\n` +
        `👉 <a href="http://localhost:3001/reports/weekly-sales">Review in CRM Hub</a>`
      ).catch(() => {});
    }

    return report;
  }

  /**
   * List past weekly sales reports
   */
  async findAll(params: { userId?: string; status?: WeeklyReportStatus; page?: number; limit?: number }, ctx: RequestContext) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.WeeklySalesReportWhereInput = {};
    if (params.userId) where.userId = params.userId;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.weeklySalesReport.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { weekStartDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.weeklySalesReport.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single report by ID
   */
  async findById(id: string) {
    const report = await this.prisma.weeklySalesReport.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!report) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Weekly sales report not found');
    }
    return report;
  }

  /**
   * Manager Sign-Off
   */
  async signOff(id: string, notes: string, ctx: RequestContext) {
    const report = await this.prisma.weeklySalesReport.findUnique({ where: { id } });
    if (!report) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Weekly sales report not found');
    }

    const updated = await this.prisma.weeklySalesReport.update({
      where: { id },
      data: {
        status: WeeklyReportStatus.REVIEWED,
        reviewedById: ctx.userId,
        reviewedAt: new Date(),
        managerNotes: notes,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.WEEKLY_REPORT_REVIEWED,
      entityType: 'WeeklySalesReport',
      entityId: report.id,
      after: { reviewedById: ctx.userId, managerNotes: notes },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.notifications.dispatch({
      userId: report.userId,
      type: NotificationType.SYSTEM,
      title: '✅ Weekly Sales Report Reviewed',
      message: `Your manager has reviewed and signed off on your Weekly Sales Performance Report.`,
      entity: { type: 'WEEKLY_REPORT', id: report.id },
    }).catch(() => {});

    return updated;
  }
}
