import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma/prisma.service';
import { AppConfig } from '@app/config/configuration';

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig>,
  ) {}

  /**
   * Retrieves the active Telegram configuration.
   * Priority: SiteSetting in DB (set from Admin UI) > .env configuration.
   */
  async getConfig(): Promise<{ enabled: boolean; botToken: string; chatId: string }> {
    const envTelegram = this.config.get<AppConfig['telegram']>('telegram');
    let enabled = envTelegram?.enabled ?? false;
    let botToken = envTelegram?.botToken ?? '';
    let chatId = envTelegram?.chatId ?? '';

    try {
      const [dbToken, dbChatId, dbEnabled] = await Promise.all([
        this.prisma.siteSetting.findUnique({ where: { key: 'telegram_bot_token' } }),
        this.prisma.siteSetting.findUnique({ where: { key: 'telegram_chat_id' } }),
        this.prisma.siteSetting.findUnique({ where: { key: 'telegram_enabled' } }),
      ]);

      if (dbToken?.value) botToken = dbToken.value.trim();
      if (dbChatId?.value) chatId = dbChatId.value.trim();
      if (dbEnabled?.value !== undefined && dbEnabled?.value !== null) {
        enabled = dbEnabled.value === 'true';
      }
    } catch (err: any) {
      this.logger.debug(`Could not load Telegram settings from DB: ${err?.message}`);
    }

    // Auto-enable if botToken and chatId are present unless explicitly disabled
    const isConfigured = Boolean(botToken && chatId);
    return {
      enabled: enabled || isConfigured,
      botToken,
      chatId,
    };
  }

  /**
   * Generates candidate chat IDs (e.g. handling missing negative signs for groups/channels).
   */
  private getChatIdCandidates(rawChatId: string): string[] {
    const trimmed = (rawChatId || '').trim();
    if (!trimmed) return [];
    const candidates: string[] = [trimmed];

    // If it doesn't start with '-' or '@', try group/supergroup prefixes
    if (!trimmed.startsWith('-') && !trimmed.startsWith('@')) {
      if (trimmed.startsWith('100')) {
        candidates.push(`-${trimmed}`);
      } else {
        candidates.push(`-${trimmed}`);
        candidates.push(`-100${trimmed}`);
      }
    }
    return Array.from(new Set(candidates));
  }

  /**
   * Sends an HTML-formatted message to the designated Telegram chat.
   */
  async sendAlert(htmlText: string, customChatId?: string): Promise<TelegramSendResult> {
    const { enabled, botToken, chatId } = await this.getConfig();
    const targetChatId = customChatId || chatId;

    if (!enabled || !botToken || !targetChatId) {
      this.logger.debug('Telegram alert skipped: botToken or chatId not configured or disabled.');
      return { success: false, error: 'Telegram not configured or disabled' };
    }

    const candidates = this.getChatIdCandidates(targetChatId);
    let lastError = '';

    for (const candidate of candidates) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: candidate,
            text: htmlText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          return { success: true, messageId: data.result?.message_id };
        }
        lastError = data.description || 'Unknown Telegram error';
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    this.logger.warn(`Telegram API error for chat ${targetChatId}: ${lastError}`);
    return { success: false, error: lastError };
  }

  /**
   * Tests Telegram bot connection by fetching bot information and sending a test ping.
   * Automatically persists valid credentials to SiteSetting upon successful ping.
   */
  async testConnection(testToken?: string, testChatId?: string): Promise<{ success: boolean; botName?: string; workingChatId?: string; error?: string }> {
    const config = await this.getConfig();
    const token = (testToken || config.botToken || '').trim();
    const chat = (testChatId || config.chatId || '').trim();

    if (!token) {
      return { success: false, error: 'Bot token is missing. Please provide a valid Telegram bot token.' };
    }

    try {
      // 1. Verify token with getMe
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = await meRes.json();
      if (!meData.ok) {
        return { success: false, error: `Invalid bot token: ${meData.description}` };
      }

      const botName = `@${meData.result?.username} (${meData.result?.first_name})`;
      let workingChatId = chat;

      // 2. If chat ID is provided, send a verification ping
      if (chat) {
        const candidates = this.getChatIdCandidates(chat);
        let sent = false;
        let lastError = '';

        for (const candidate of candidates) {
          const pingMsg = `<b>☀️ Sunseekers Travel Platform</b>\n\n✅ <b>Telegram Bot Connected Successfully!</b>\n🤖 Bot: <code>${botName}</code>\n💬 Chat ID: <code>${candidate}</code>\n⏰ Time: ${new Date().toLocaleString()}\n\n<i>Automated sales alerts, new lead pings, and escalation notifications are now active.</i>`;
          const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: candidate,
              text: pingMsg,
              parse_mode: 'HTML',
            }),
          });
          const sendData = await sendRes.json();
          if (sendData.ok) {
            sent = true;
            workingChatId = candidate;
            break;
          } else {
            lastError = sendData.description || 'Unknown Telegram error';
          }
        }

        if (!sent) {
          return {
            success: false,
            botName,
            error: `Bot verified (${botName}), but could not send to Chat ID "${chat}": ${lastError}. Make sure the bot has been added as an Administrator to your group/channel.`,
          };
        }
      }

      // Automatically persist valid credentials if provided
      if (token) {
        await this.prisma.siteSetting.upsert({
          where: { key: 'telegram_bot_token' },
          create: { key: 'telegram_bot_token', group: 'telegram', value: token, isPublic: false },
          update: { value: token },
        });
        if (workingChatId) {
          await this.prisma.siteSetting.upsert({
            where: { key: 'telegram_chat_id' },
            create: { key: 'telegram_chat_id', group: 'telegram', value: workingChatId, isPublic: false },
            update: { value: workingChatId },
          });
        }
        await this.prisma.siteSetting.upsert({
          where: { key: 'telegram_enabled' },
          create: { key: 'telegram_enabled', group: 'telegram', value: 'true', isPublic: false },
          update: { value: 'true' },
        });
      }

      return { success: true, botName, workingChatId };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // --------------------------------------------------------------------------
  // HIGH-LEVEL SALES ALERTS
  // --------------------------------------------------------------------------

  async sendNewLeadAlert(lead: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    destination?: string | null;
    interestedTour?: string | null;
    assignedStaffName?: string | null;
    isDuplicate?: boolean;
  }): Promise<void> {
    const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'New Lead';
    const tag = lead.isDuplicate ? '⚠️ EXISTING CUSTOMER RE-INQUIRY' : '🚨 NEW SALES LEAD';

    const msg = [
      `<b>${tag}</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 <b>Customer:</b> ${name}`,
      lead.phone ? `📞 <b>Phone:</b> <code>${lead.phone}</code>` : null,
      lead.email ? `✉️ <b>Email:</b> ${lead.email}` : null,
      lead.interestedTour ? `🎒 <b>Interested Tour:</b> ${lead.interestedTour}` : null,
      lead.destination ? `📍 <b>Destination:</b> ${lead.destination}` : null,
      lead.source ? `🌐 <b>Source:</b> ${lead.source}` : null,
      lead.assignedStaffName ? `💼 <b>Assigned To:</b> <b>${lead.assignedStaffName}</b>` : `⚠️ <i>Unassigned</i>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👉 <a href="http://localhost:3001/leads">Open CRM Leads Board</a>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendAlert(msg);
  }

  async sendDealWonAlert(deal: {
    id: string;
    name: string;
    value?: number | string | null;
    currency?: string | null;
    salespersonName?: string | null;
    invoiceNumber?: string | null;
  }): Promise<void> {
    const val = deal.value ? `${Number(deal.value).toLocaleString()} ${deal.currency || 'USD'}` : 'N/A';
    const msg = [
      `🎉 <b>DEAL WON! NEW BOOKING!</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `💼 <b>Deal:</b> ${deal.name}`,
      `💰 <b>Amount:</b> <b>${val}</b>`,
      deal.salespersonName ? `🌟 <b>Sales Rep:</b> ${deal.salespersonName}` : null,
      deal.invoiceNumber ? `📄 <b>Invoice Generated:</b> <code>${deal.invoiceNumber}</code>` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👉 <a href="http://localhost:3001/deals">View in CRM</a>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendAlert(msg);
  }

  async sendPaymentReceivedAlert(payment: {
    receiptNumber: string;
    amount: number | string;
    currency: string;
    method: string;
    customerName?: string | null;
    invoiceNumber?: string | null;
  }): Promise<void> {
    const formattedAmount = `${Number(payment.amount).toLocaleString()} ${payment.currency}`;
    const msg = [
      `💰 <b>PAYMENT CONFIRMED</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🧾 <b>Receipt:</b> <code>${payment.receiptNumber}</code>`,
      `💵 <b>Amount Paid:</b> <b>${formattedAmount}</b>`,
      `💳 <b>Method:</b> ${payment.method}`,
      payment.customerName ? `👤 <b>Customer:</b> ${payment.customerName}` : null,
      payment.invoiceNumber ? `📄 <b>Invoice:</b> ${payment.invoiceNumber}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👉 <a href="http://localhost:3001/payments">View Payments Board</a>`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendAlert(msg);
  }

  async sendInactivityEscalation(alert: {
    type: 'LEAD' | 'DEAL';
    title: string;
    assignedStaff: string;
    hoursInactive: number;
    url: string;
  }): Promise<void> {
    const msg = [
      `⏱️ <b>SALES INACTIVITY SLA ESCALATION</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `⚠️ <b>${alert.type}:</b> ${alert.title}`,
      `👤 <b>Assigned To:</b> ${alert.assignedStaff}`,
      `⏳ <b>Inactivity Duration:</b> ${alert.hoursInactive} hours with zero updates`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👉 <a href="${alert.url}">Take Action in CRM</a>`,
    ].join('\n');

    await this.sendAlert(msg);
  }

  async sendOverdueInvoiceAlert(alert: {
    invoiceNumber: string;
    amount: string;
    dueDate: string;
    customerName: string;
    daysOverdue: number;
  }): Promise<void> {
    const msg = [
      `⚠️ <b>OVERDUE INVOICE ALERT (Day +${alert.daysOverdue})</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📄 <b>Invoice:</b> <code>${alert.invoiceNumber}</code>`,
      `💰 <b>Amount Due:</b> <b>${alert.amount}</b>`,
      `👤 <b>Customer:</b> ${alert.customerName}`,
      `📅 <b>Original Due Date:</b> ${alert.dueDate}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👉 <a href="http://localhost:3001/invoices">Review Invoices</a>`,
    ].join('\n');

    await this.sendAlert(msg);
  }
}
