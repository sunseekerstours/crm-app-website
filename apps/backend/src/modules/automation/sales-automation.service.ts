import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { TelegramService } from '@app/modules/telegram/telegram.service';
import { NotificationsService } from '@app/modules/notifications/notifications.service';
import { TimelineService } from '@app/modules/timeline/timeline.service';
import {
  AuditableAction,
  DealStage,
  InvoiceStatus,
  Lead,
  LeadStage,
  NotificationType,
  Payment,
  PaymentStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';

@Injectable()
export class SalesAutomationService {
  private readonly logger = new Logger(SalesAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly notifications: NotificationsService,
    private readonly timeline: TimelineService,
  ) {}

  /**
   * Helper to check if a specific automation rule is enabled via SiteSetting in DB.
   */
  async isRuleEnabled(settingKey: string, defaultValue = true): Promise<boolean> {
    try {
      const setting = await this.prisma.siteSetting.findUnique({
        where: { key: settingKey },
      });
      if (!setting || setting.value === null || setting.value === undefined) {
        return defaultValue;
      }
      return setting.value === 'true';
    } catch {
      return defaultValue;
    }
  }

  async getNumericSetting(settingKey: string, defaultValue: number): Promise<number> {
    try {
      const setting = await this.prisma.siteSetting.findUnique({
        where: { key: settingKey },
      });
      if (!setting || !setting.value) return defaultValue;
      const parsed = parseInt(setting.value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  }

  // ==========================================================================
  // AUTOMATION 11: Duplicate Customer/Lead Detection
  // ==========================================================================
  async detectDuplicate(input: {
    email?: string | null;
    phone?: string | null;
  }): Promise<{ isDuplicate: boolean; existingCustomerId?: string; existingCustomerName?: string; existingLeadId?: string; assignedStaffId?: string }> {
    const email = input.email?.trim().toLowerCase();
    const cleanPhone = (input.phone || '').replace(/[\s\-\(\)\+]/g, '');

    if (!email && (!cleanPhone || cleanPhone.length < 7)) {
      return { isDuplicate: false };
    }

    // 1. Check existing Customers
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        OR: [
          email ? { email: { equals: email, mode: 'insensitive' } } : {},
          cleanPhone.length >= 7 ? { phone: { contains: cleanPhone } } : {},
          cleanPhone.length >= 7 ? { whatsapp: { contains: cleanPhone } } : {},
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedStaffId: true,
      },
    });

    if (existingCustomer) {
      return {
        isDuplicate: true,
        existingCustomerId: existingCustomer.id,
        existingCustomerName: `${existingCustomer.firstName} ${existingCustomer.lastName}`.trim(),
        assignedStaffId: existingCustomer.assignedStaffId || undefined,
      };
    }

    // 2. Check existing open Leads (created within last 60 days)
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        stage: { notIn: [LeadStage.WON, LeadStage.LOST] },
        OR: [
          email ? { email: { equals: email, mode: 'insensitive' } } : {},
          cleanPhone.length >= 7 ? { phone: { contains: cleanPhone } } : {},
        ],
      },
      select: { id: true, assignedUserId: true },
    });

    if (existingLead) {
      return {
        isDuplicate: true,
        existingLeadId: existingLead.id,
        assignedStaffId: existingLead.assignedUserId || undefined,
      };
    }

    return { isDuplicate: false };
  }

  // ==========================================================================
  // AUTOMATION 1 & 2: Auto-Assignment & Immediate Follow-Up Task
  // ==========================================================================
  async handleNewLead(lead: Lead): Promise<void> {
    const isAutoAssignEnabled = await this.isRuleEnabled('automation_auto_assign_lead', true);
    let assignedUserId = lead.assignedUserId;
    let assignedUserName: string | undefined;

    // 1. Auto-assign if not currently assigned
    if (!assignedUserId && isAutoAssignEnabled) {
      // Find active sales agents or admins
      const activeSalesReps = await this.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          roles: {
            some: {
              role: {
                name: { in: ['SALES_AGENT', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'] },
              },
            },
          },
        },
        include: {
          assignedLeads: {
            where: { stage: { in: [LeadStage.NEW, LeadStage.CONTACTED, LeadStage.QUALIFIED] } },
            select: { id: true },
          },
        },
      });

      if (activeSalesReps.length > 0) {
        // Sort by fewest active leads (least busy agent)
        activeSalesReps.sort((a, b) => a.assignedLeads.length - b.assignedLeads.length);
        const chosen = activeSalesReps[0];
        assignedUserId = chosen.id;
        assignedUserName = `${chosen.firstName || ''} ${chosen.lastName || ''}`.trim() || chosen.email;

        // Update the lead
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { assignedUserId },
        });

        this.logger.log(`[Auto-Assignment] Lead ${lead.id} assigned to ${assignedUserName} (${chosen.id})`);
      }
    } else if (assignedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: assignedUserId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (user) {
        assignedUserName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      }
    }

    // 2. Immediate Follow-Up Task (Automation #2)
    const isTaskEnabled = await this.isRuleEnabled('automation_immediate_follow_up_task', true);
    if (isTaskEnabled && assignedUserId) {
      const slaHours = await this.getNumericSetting('automation_lead_sla_hours', 2);
      const dueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000);
      const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'New Lead';

      await this.prisma.task.create({
        data: {
          title: `Contact lead: ${leadName}`,
          description: `Immediate outreach required for new inquiry (${lead.interestedTour || lead.destination || 'Travel inquiry'}). SLA: ${slaHours} hours.`,
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          assignedToId: assignedUserId,
          leadId: lead.id,
          customerId: lead.customerId || undefined,
          dueDate,
        },
      });
    }

    // 3. In-App Notification to assigned staff
    if (assignedUserId) {
      const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'New Lead';
      await this.notifications.dispatch({
        userId: assignedUserId,
        type: NotificationType.SYSTEM,
        title: 'New Lead Assigned to You',
        message: `${leadName} (${lead.interestedTour || lead.destination || 'Trip request'}) has been assigned to you.`,
        entity: { type: 'LEAD', id: lead.id },
      });
    }

    // 4. Telegram Alert to Operations/Sales Team
    await this.telegram.sendNewLeadAlert({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      destination: lead.destination,
      interestedTour: lead.interestedTour,
      assignedStaffName: assignedUserName,
    });
  }

  // ==========================================================================
  // AUTOMATION 4: Lead Qualified → Sales Opportunity (Deal)
  // ==========================================================================
  async handleLeadQualified(leadId: string): Promise<void> {
    const isEnabled = await this.isRuleEnabled('automation_lead_to_deal_on_qualified', true);
    if (!isEnabled) return;

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { customer: true, assignedUser: true },
    });
    if (!lead) return;

    // Check if a Deal already exists for this lead
    const existingDeal = await this.prisma.deal.findFirst({
      where: { leadId },
    });
    if (existingDeal) return;

    // Ensure customer exists
    let customerId = lead.customerId;
    if (!customerId) {
      const newCustomer = await this.prisma.customer.create({
        data: {
          firstName: lead.firstName || 'Valued',
          lastName: lead.lastName || 'Client',
          email: lead.email,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          assignedStaffId: lead.assignedUserId,
          country: lead.destination || 'Ghana',
        },
      });
      customerId = newCustomer.id;
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { customerId },
      });
    }

    const customerName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Client';
    const dealName = `${customerName} - ${lead.interestedTour || lead.destination || 'Tour Package'}`;
    const defaultDealValue = await this.getNumericSetting('automation_default_deal_value', 2500);
    const dealValue = lead.estimatedValue ? Number(lead.estimatedValue) : defaultDealValue;
    const currency = lead.currency || 'USD';

    const deal = await this.prisma.deal.create({
      data: {
        name: dealName,
        customerId,
        leadId: lead.id,
        salespersonId: lead.assignedUserId,
        tour: lead.interestedTour,
        destination: lead.destination,
        value: dealValue,
        currency,
        stage: DealStage.QUALIFIED,
        probability: 40,
        expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      },
    });

    await this.timeline.record({
      entityType: 'LEAD',
      entityId: lead.id,
      type: 'lead.qualified_deal_created',
      title: 'Opportunity Created Automatically',
      description: `Deal "${dealName}" created with value ${dealValue} ${currency}.`,
      actorId: lead.assignedUserId,
    });

    if (lead.assignedUserId) {
      await this.notifications.dispatch({
        userId: lead.assignedUserId,
        type: NotificationType.SYSTEM,
        title: 'New Opportunity Created',
        message: `Lead was qualified! Deal "${dealName}" has been added to your pipeline.`,
        entity: { type: 'DEAL', id: deal.id },
      });
    }

    await this.telegram.sendAlert(
      `🎯 <b>LEAD QUALIFIED ➔ NEW OPPORTUNITY CREATED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💼 <b>Opportunity:</b> ${dealName}\n` +
      `💰 <b>Estimated Value:</b> ${dealValue.toLocaleString()} ${currency}\n` +
      `👤 <b>Rep:</b> ${lead.assignedUser?.firstName || 'Assigned Agent'}\n` +
      `👉 <a href="http://localhost:3001/deals">View in CRM Pipeline</a>`
    );

    this.logger.log(`[Auto-Opportunity] Created deal ${deal.id} for qualified lead ${lead.id}`);
  }

  // ==========================================================================
  // AUTOMATION 7: Deal Won → Automatic Invoice
  // ==========================================================================
  async handleDealWon(dealId: string, actorId?: string): Promise<void> {
    const isEnabled = await this.isRuleEnabled('automation_deal_to_invoice_on_won', true);
    if (!isEnabled) return;

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { customer: true, salesperson: true, quotes: true },
    });
    if (!deal) return;

    // Check if an invoice already exists
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { dealId },
    });
    if (existingInvoice) return;

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const amount = deal.value || 0;
    const currency = deal.currency || 'USD';
    const invoiceDueDays = await this.getNumericSetting('automation_invoice_due_days', 7);
    const dueDate = new Date(Date.now() + invoiceDueDays * 24 * 60 * 60 * 1000);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: deal.customerId,
        dealId: deal.id,
        amount,
        amountPaid: 0,
        currency,
        status: InvoiceStatus.ISSUED,
        issueDate: new Date(),
        dueDate,
        items: [
          {
            description: deal.tour || deal.name,
            amount: Number(amount),
            quantity: 1,
          },
        ],
        terms: `Payment due within ${invoiceDueDays} days. Bank transfer or Mobile Money accepted.`,
        createdById: actorId || deal.salespersonId,
      },
    });

    // Mark any pending quotes as ACCEPTED
    await this.prisma.quote.updateMany({
      where: { dealId: deal.id, status: { in: ['DRAFT', 'SENT'] } },
      data: { status: 'ACCEPTED' },
    });

    await this.timeline.record({
      entityType: 'DEAL',
      entityId: deal.id,
      type: 'deal.won_invoice_created',
      title: 'Invoice Created Automatically',
      description: `Deal marked Won. Invoice ${invoiceNumber} created for ${amount} ${currency}.`,
      actorId,
    });

    const repName = deal.salesperson
      ? `${deal.salesperson.firstName || ''} ${deal.salesperson.lastName || ''}`.trim()
      : undefined;

    await this.telegram.sendDealWonAlert({
      id: deal.id,
      name: deal.name,
      value: Number(amount),
      currency,
      salespersonName: repName,
      invoiceNumber: invoice.invoiceNumber,
    });

    this.logger.log(`[Auto-Invoice] Generated invoice ${invoice.id} for won deal ${deal.id}`);
  }

  // ==========================================================================
  // AUTOMATION 8 & 10: Payment Confirmed → Receipt & Post-Sale Care
  // ==========================================================================
  async handlePaymentRecorded(payment: Payment): Promise<void> {
    const isReceiptEnabled = await this.isRuleEnabled('automation_auto_receipt_on_payment', true);
    if (!isReceiptEnabled) return;

    let receiptNumber = payment.receiptNumber;
    if (!receiptNumber) {
      receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { receiptNumber, status: PaymentStatus.COMPLETED },
      });
    }

    let customerName = 'Valued Customer';
    let invoiceNumber: string | undefined;

    // 1. Update linked Invoice
    if (payment.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { customer: true },
      });

      if (invoice) {
        invoiceNumber = invoice.invoiceNumber;
        if (invoice.customer) {
          customerName = `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim();
        }

        const newPaid = Number(invoice.amountPaid || 0) + Number(payment.amount || 0);
        const isPaidFull = newPaid >= Number(invoice.amount || 0);

        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newPaid,
            status: isPaidFull ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          },
        });

        // 2. If booking linked to invoice, auto-confirm booking
        if (isPaidFull && invoice.bookingId) {
          await this.prisma.booking.update({
            where: { id: invoice.bookingId },
            data: { status: 'CONFIRMED' },
          });
        }
      }
    }

    // 3. Post-Sale Follow-Up Task (Automation #10)
    const isPostSaleEnabled = await this.isRuleEnabled('automation_post_sale_follow_up', true);
    if (isPostSaleEnabled && payment.customerId) {
      const postSaleSlaHours = await this.getNumericSetting('automation_post_sale_sla_hours', 48);
      await this.prisma.task.create({
        data: {
          title: `Post-Sale: Send travel documents & welcome package to ${customerName}`,
          description: `Payment received (${payment.amount} ${payment.currency}). Prepare itinerary confirmation, emergency contacts, and packing guidelines.`,
          priority: TaskPriority.NORMAL,
          status: TaskStatus.PENDING,
          customerId: payment.customerId,
          dueDate: new Date(Date.now() + postSaleSlaHours * 60 * 60 * 1000),
        },
      });
    }

    // 4. Send Telegram Alert
    await this.telegram.sendPaymentReceivedAlert({
      receiptNumber: receiptNumber || 'REC-CONFIRMED',
      amount: payment.amount ? Number(payment.amount) : 0,
      currency: payment.currency,
      method: payment.method,
      customerName,
      invoiceNumber,
    });

    this.logger.log(`[Auto-Receipt] Handled payment ${payment.id}, receipt ${receiptNumber}`);
  }

  // ==========================================================================
  // AUTOMATION 12 & 6: Background Sweeps (Inactivity & Quote Follow-Up)
  // ==========================================================================
  async runSweeps(): Promise<{ inactivityEscalations: number; quoteFollowUps: number }> {
    let inactivityCount = 0;
    let quoteCount = 0;

    // 1. Sales Inactivity Watchdog (Automation #12)
    const isWatchdogEnabled = await this.isRuleEnabled('automation_sales_inactivity_escalation', true);
    if (isWatchdogEnabled) {
      const escalateHours = await this.getNumericSetting('automation_inactivity_escalate_hours', 48);
      const cutoffEscalate = new Date(Date.now() - escalateHours * 60 * 60 * 1000);

      // Find active leads in NEW or CONTACTED with no update past cutoff
      const inactiveLeads = await this.prisma.lead.findMany({
        where: {
          stage: { in: [LeadStage.NEW, LeadStage.CONTACTED] },
          updatedAt: { lt: cutoffEscalate },
          assignedUserId: { not: null },
        },
        include: { assignedUser: true },
        take: 10,
      });

      for (const lead of inactiveLeads) {
        const repName = lead.assignedUser
          ? `${lead.assignedUser.firstName || ''} ${lead.assignedUser.lastName || ''}`.trim()
          : 'Unknown';
        const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead';

        await this.telegram.sendInactivityEscalation({
          type: 'LEAD',
          title: `${leadName} (${lead.interestedTour || 'Trip inquiry'})`,
          assignedStaff: repName,
          hoursInactive: escalateHours,
          url: `http://localhost:3001/leads`,
        });

        if (lead.assignedUserId) {
          await this.notifications.dispatch({
            userId: lead.assignedUserId,
            type: NotificationType.SYSTEM,
            title: '⚠️ Inactivity SLA Alert',
            message: `Lead ${leadName} has had no activity for over ${escalateHours} hours. Please update the status.`,
            entity: { type: 'LEAD', id: lead.id },
          });
        }
        inactivityCount++;
      }
    }

    // 2. Quote Follow-Up Reminders (Automation #6)
    const isQuoteReminderEnabled = await this.isRuleEnabled('automation_quote_follow_up', true);
    if (isQuoteReminderEnabled) {
      const quoteFollowUpDays = await this.getNumericSetting('automation_quote_follow_up_days', 3);
      const cutoffQuote = new Date(Date.now() - quoteFollowUpDays * 24 * 60 * 60 * 1000);
      const pendingQuotes = await this.prisma.quote.findMany({
        where: {
          status: 'SENT',
          updatedAt: { lt: cutoffQuote },
        },
        include: { customer: true, createdBy: true },
        take: 10,
      });

      for (const quote of pendingQuotes) {
        const client = quote.customer
          ? `${quote.customer.firstName} ${quote.customer.lastName}`.trim()
          : 'Client';

        if (quote.createdById) {
          await this.notifications.dispatch({
            userId: quote.createdById,
            type: NotificationType.SYSTEM,
            title: `Quote Follow-Up: ${quote.quoteNumber}`,
            message: `Quote for ${client} (${quote.totalPrice} ${quote.currency}) was sent ${quoteFollowUpDays} days ago. Time to check in!`,
            entity: { type: 'QUOTE', id: quote.id },
          });
        }
        quoteCount++;
      }
    }

    return { inactivityEscalations: inactivityCount, quoteFollowUps: quoteCount };
  }
}
