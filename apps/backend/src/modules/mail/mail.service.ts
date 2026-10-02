import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface BookingEmailData {
  to: string;
  customerName: string;
  bookingReference: string;
  tourTitle?: string;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  currency?: string;
}

export interface InvoiceEmailData {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate?: string;
  status: string;
  viewUrl?: string;
}

export interface PaymentReceiptData {
  to: string;
  customerName: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionRef?: string;
  date: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private defaultFrom = 'Sunseekers Tours <noreply@sunseekerstours.com>';
  private defaultReplyTo = '';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.initTransporter();
  }

  /**
   * Initializes or re-initializes the nodemailer transport from environment config.
   */
  public initTransporter() {
    const smtp = this.config.get<{
      enabled: boolean;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
      replyTo?: string;
    }>('smtp');

    if (!smtp || !smtp.host || !smtp.user) {
      this.logger.warn(
        'External SMTP is not fully configured (missing SMTP_HOST or SMTP_USER). Outgoing emails will fallback to logger.',
      );
      this.transporter = null;
      this.isConfigured = false;
      return;
    }

    this.defaultFrom = smtp.from || 'Sunseekers Tours <noreply@sunseekerstours.com>';
    this.defaultReplyTo = smtp.replyTo || '';

    try {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port || (smtp.secure ? 465 : 587),
        secure: smtp.secure ?? smtp.port === 465,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
        tls: {
          // Do not fail on self-signed / custom domain certificates
          rejectUnauthorized: false,
        },
      });

      this.isConfigured = true;
      this.logger.log(
        `External SMTP mailer initialized successfully for ${smtp.user}@${smtp.host}:${smtp.port}`,
      );

      // Verify connection in the background without blocking boot
      this.transporter.verify((error) => {
        if (error) {
          this.logger.error(`SMTP connection verification failed: ${error.message}`);
        } else {
          this.logger.log('SMTP server connection verified ready to send emails.');
        }
      });
    } catch (err: any) {
      this.logger.error(`Failed to create SMTP transporter: ${err?.message}`);
      this.transporter = null;
      this.isConfigured = false;
    }
  }

  /**
   * Returns current SMTP status for health and settings check.
   */
  public getStatus() {
    const smtp = this.config.get<{
      enabled: boolean;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      from: string;
    }>('smtp');

    return {
      configured: this.isConfigured,
      host: smtp?.host || null,
      port: smtp?.port || null,
      user: smtp?.user ? `${smtp.user.slice(0, 3)}***` : null,
      from: this.defaultFrom,
    };
  }

  /**
   * Primary method to send an email with fallback to console if unconfigured.
   */
  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string }> {
    const from = options.from || this.defaultFrom;
    const replyTo = options.replyTo || this.defaultReplyTo || undefined;
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    if (!this.transporter || !this.isConfigured) {
      this.logger.warn(
        `[SMTP Simulated] To: ${to} | Subject: "${options.subject}" (External SMTP not active. Configure SMTP_HOST, SMTP_USER, SMTP_PASS to send real mail)`,
      );
      return { success: true, messageId: 'simulated-' + Date.now() };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        replyTo,
        subject: options.subject,
        text: options.text || this.stripHtml(options.html || ''),
        html: options.html,
      });

      this.logger.log(`Email delivered to ${to} [MessageId: ${info.messageId}]`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends a branded general notification email to a staff or customer.
   */
  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
    actionUrl?: string,
  ): Promise<boolean> {
    const subject = `[Sunseekers] ${title}`;
    const html = this.buildBaseTemplate({
      title,
      contentHtml: `<p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 24px;">${this.escapeHtml(
        message,
      )}</p>`,
      actionBtn: actionUrl ? { text: 'View in Dashboard', url: actionUrl } : undefined,
    });

    try {
      await this.sendMail({ to, subject, html });
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not dispatch notification email to ${to}: ${err.message}`);
      return false;
    }
  }

  /**
   * Sends password reset email.
   */
  async sendPasswordResetEmail(to: string, resetToken: string, appUrl?: string): Promise<boolean> {
    const baseUrl = appUrl || process.env.ADMIN_URL || 'https://admin.sunseekerstours.com';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Sunseekers CRM Password';

    const contentHtml = `
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        We received a request to reset your password for your Sunseekers CRM account.
      </p>
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        Click the button below to set a new password. This link will expire in 1 hour.
      </p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 16px;">
        If you did not request this password reset, please ignore this email or contact your administrator immediately.
      </p>
    `;

    const html = this.buildBaseTemplate({
      title: 'Password Reset Request',
      contentHtml,
      actionBtn: { text: 'Reset Password', url: resetLink },
    });

    try {
      await this.sendMail({ to, subject, html });
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not send password reset to ${to}: ${err.message}`);
      return false;
    }
  }

  /**
   * Sends booking confirmation email.
   */
  async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    const subject = `Booking Confirmation - Ref: ${data.bookingReference}`;
    const amountStr = data.totalAmount != null ? `${data.currency || 'USD'} ${data.totalAmount.toLocaleString()}` : '';

    const contentHtml = `
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        Dear <strong>${this.escapeHtml(data.customerName)}</strong>,
      </p>
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        Thank you for choosing Sunseekers Tours! Your booking has been received and confirmed.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Booking Reference:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${this.escapeHtml(data.bookingReference)}</td>
          </tr>
          ${data.tourTitle ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Tour / Package:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${this.escapeHtml(data.tourTitle)}</td>
          </tr>` : ''}
          ${data.startDate ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Departure Date:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${this.escapeHtml(data.startDate)}</td>
          </tr>` : ''}
          ${amountStr ? `
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="padding: 12px 0 4px; color: #0f172a; font-weight: 600;">Total Amount:</td>
            <td style="padding: 12px 0 4px; color: #ea580c; font-weight: 700; font-size: 16px; text-align: right;">${amountStr}</td>
          </tr>` : ''}
        </table>
      </div>
      <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
        Our travel specialist is reviewing your itinerary and will be in touch with further travel details.
      </p>
    `;

    const html = this.buildBaseTemplate({
      title: 'Your Booking Is Confirmed',
      contentHtml,
    });

    try {
      await this.sendMail({ to: data.to, subject, html });
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not send booking confirmation to ${data.to}: ${err.message}`);
      return false;
    }
  }

  /**
   * Sends invoice receipt or notification email.
   */
  async sendInvoiceEmail(data: InvoiceEmailData): Promise<boolean> {
    const subject = `Invoice ${data.invoiceNumber} from Sunseekers Tours`;
    const amountStr = `${data.currency} ${data.amount.toLocaleString()}`;

    const contentHtml = `
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        Dear <strong>${this.escapeHtml(data.customerName)}</strong>,
      </p>
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        Here is the invoice <strong>${this.escapeHtml(data.invoiceNumber)}</strong> for your booking with Sunseekers Tours.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Invoice Number:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${this.escapeHtml(data.invoiceNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Status:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${this.escapeHtml(data.status)}</td>
          </tr>
          ${data.dueDate ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Due Date:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${this.escapeHtml(data.dueDate)}</td>
          </tr>` : ''}
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="padding: 12px 0 4px; color: #0f172a; font-weight: 600;">Amount:</td>
            <td style="padding: 12px 0 4px; color: #0f172a; font-weight: 700; font-size: 16px; text-align: right;">${amountStr}</td>
          </tr>
        </table>
      </div>
    `;

    const html = this.buildBaseTemplate({
      title: 'Invoice Details',
      contentHtml,
      actionBtn: data.viewUrl ? { text: 'View Invoice', url: data.viewUrl } : undefined,
    });

    try {
      await this.sendMail({ to: data.to, subject, html });
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not send invoice to ${data.to}: ${err.message}`);
      return false;
    }
  }

  /**
   * Helper to build a clean responsive HTML email template with Sunseekers styling.
   */
  private buildBaseTemplate(opts: {
    title: string;
    contentHtml: string;
    actionBtn?: { text: string; url: string };
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(opts.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 36px; text-align: left; border-bottom: 3px solid #f97316;">
              <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase;">SUNSEEKERS</span>
              <span style="display: block; font-size: 12px; color: #f97316; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;">Tours & Travel Management</span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                ${this.escapeHtml(opts.title)}
              </h2>
              ${opts.contentHtml}
              ${
                opts.actionBtn
                  ? `
              <div style="margin: 32px 0 16px; text-align: center;">
                <a href="${this.escapeHtml(opts.actionBtn.url)}" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px; text-decoration: none; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.25);">
                  ${this.escapeHtml(opts.actionBtn.text)}
                </a>
              </div>`
                  : ''
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">
                Sunseekers Tours • Quality Travel Experiences
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Accra, Ghana • Tel: +233 (0) 302 770 033 • info@sunseekerstours.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '').trim();
  }
}
