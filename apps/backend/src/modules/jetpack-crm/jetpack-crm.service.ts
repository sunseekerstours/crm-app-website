import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@app/config/configuration';
import { PrismaService } from '@app/prisma/prisma.service';
import { SalesAutomationService } from '@app/modules/automation/sales-automation.service';
import { TelegramService } from '@app/modules/telegram/telegram.service';
import { CustomerStatus, LeadSource, LeadStage } from '@prisma/client';

export interface JetpackContactInput {
  email: string;
  fname?: string;
  lname?: string;
  status?: string;
  mobtel?: string;
  worktel?: string;
  hometel?: string;
  addr1?: string;
  addr2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  tags?: string[];
  notes?: string;
  [customField: string]: any;
}

export interface JetpackSyncResult {
  success: boolean;
  id?: number | string;
  message?: string;
  data?: any;
  error?: string;
}

export interface ImportSummary {
  success: boolean;
  totalFetched: number;
  customersCreated: number;
  leadsCreated: number;
  updated: number;
  skipped: number;
  errors?: string[];
  timestamp: string;
}

@Injectable()
export class JetpackCrmService {
  private readonly logger = new Logger(JetpackCrmService.name);

  private readonly enabled: boolean;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private readonly config: ConfigService<AppConfig>,
    private readonly prisma: PrismaService,
    private readonly salesAutomation: SalesAutomationService,
    private readonly telegram: TelegramService,
  ) {
    const jetpack = this.config.get<AppConfig['jetpackCrm']>('jetpackCrm');
    this.enabled = jetpack?.enabled ?? false;
    this.endpoint = (jetpack?.endpoint ?? 'https://sunseekerstours.com/zbs_api/').replace(/\/?$/, '/');
    this.apiKey = jetpack?.apiKey ?? '';
    this.apiSecret = jetpack?.apiSecret ?? '';

    if (this.enabled) {
      this.logger.log(`Jetpack CRM sync enabled for endpoint: ${this.endpoint}`);
    } else {
      this.logger.log('Jetpack CRM sync is disabled via JETPACK_CRM_ENABLED');
    }
  }

  isEnabled(): boolean {
    return this.enabled && !!this.apiKey && !!this.apiSecret;
  }

  private buildUrl(path: string, extraParams: Record<string, string | number | boolean | undefined> = {}): string {
    const cleanPath = path.replace(/^\//, '');
    const url = new URL(cleanPath, this.endpoint);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('api_secret', this.apiSecret);

    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private async request<T = any>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any,
    extraParams: Record<string, any> = {},
  ): Promise<T> {
    const fullUrl = this.buildUrl(path, extraParams);
    const parsed = new URL(fullUrl);

    return new Promise<T>((resolve, reject) => {
      const https = require('https');
      const postData = data && method === 'POST' ? JSON.stringify(data) : null;

      const headers: Record<string, string> = {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'WordPress/6.8; SunseekerCRM-Client/1.0',
      };

      if (postData) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = String(Buffer.byteLength(postData));
      }

      const req = https.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: parsed.pathname + parsed.search,
          method,
          headers,
          family: 4,
          rejectUnauthorized: false,
          timeout: 25000,
        },
        (res: any) => {
          let body = '';
          res.on('data', (chunk: any) => (body += chunk));
          res.on('end', () => {
            let parsedJson: any;
            try {
              parsedJson = JSON.parse(body);
            } catch {
              parsedJson = { raw: body };
            }

            if (res.statusCode && res.statusCode >= 400) {
              return reject(
                new Error(
                  `Jetpack CRM API HTTP ${res.statusCode}: ${typeof parsedJson === 'object' ? JSON.stringify(parsedJson) : parsedJson}`,
                ),
              );
            }

            resolve(parsedJson as T);
          });
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Jetpack CRM connection timed out after 25s'));
      });

      req.on('error', (err: any) => {
        reject(err);
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  /**
   * Healthcheck / status check
   */
  async getStatus(full = false): Promise<any> {
    if (!this.apiKey || !this.apiSecret) {
      return { success: false, message: 'Jetpack CRM credentials not configured' };
    }
    try {
      const res = await this.request('status/', 'GET', undefined, full ? { full: 1 } : {});
      let count = 0;
      try {
        const sample = await this.getCustomers({ perpage: 100 });
        if (Array.isArray(sample)) count = sample.length;
      } catch {
        // ignore count error
      }

      return {
        success: true,
        endpoint: this.endpoint,
        status: res?.data?.status || 'Connected',
        crmVersion: res?.data?.crm_version || '6.8.4',
        dbVersion: res?.data?.db_version || '3.0',
        contactsAvailable: count,
        message: 'Your API Connection with Jetpack CRM is functioning correctly.',
      };
    } catch (err: any) {
      return { success: false, endpoint: this.endpoint, error: err.message };
    }
  }

  /**
   * List raw customers from Jetpack CRM
   */
  async getCustomers(params: { page?: number; perpage?: number; order?: 'ASC' | 'DESC' } = {}): Promise<any> {
    return this.request('customers/', 'GET', undefined, params);
  }

  /**
   * Search customers by query
   */
  async searchCustomers(query: string): Promise<any> {
    return this.request('search_customers/', 'GET', undefined, { zbs_query: query });
  }

  /**
   * Sync a contact / lead from our app to Jetpack CRM
   */
  async syncContact(contact: JetpackContactInput): Promise<JetpackSyncResult> {
    if (!this.isEnabled()) {
      return { success: false, message: 'Jetpack CRM sync disabled or unconfigured' };
    }

    if (!contact.email) {
      return { success: false, message: 'Email is required for Jetpack CRM contact sync' };
    }

    try {
      this.logger.debug(`Syncing contact to Jetpack CRM: ${contact.email} (${contact.fname} ${contact.lname})`);
      const {
        email,
        fname = '',
        lname = '',
        status = 'Lead',
        mobtel = '',
        worktel = '',
        hometel = '',
        addr1 = '',
        addr2 = '',
        city = '',
        country = '',
        tags = ['SUNSEEKER_APP'],
        notes = '',
        ...rest
      } = contact;

      const res = await this.request('create_customer/', 'POST', {
        email,
        fname,
        lname,
        status,
        mobtel,
        worktel,
        hometel,
        addr1,
        addr2,
        city,
        country,
        tags,
        notes,
        ...rest,
      });

      const contactId = res?.id || res?.data?.id;
      this.logger.log(`Successfully synced contact ${contact.email} to Jetpack CRM (ID: ${contactId ?? 'updated'})`);

      return {
        success: true,
        id: contactId,
        data: res,
      };
    } catch (err: any) {
      this.logger.error(`Failed to sync contact ${contact.email} to Jetpack CRM: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * IMPORT ALL DATA FROM JETPACK CRM INTO SUNSEEKER CRM
   * Imports contacts, creates Customers, creates Leads for sales pipeline, attaches notes,
   * runs sales automations (assignment, outreach SLA, telegram alerts).
   */
  async importFromJetpack(options?: { limit?: number }): Promise<ImportSummary> {
    const limit = options?.limit || 100;
    this.logger.log(`[Jetpack Sync] Starting import of contacts from Jetpack CRM (limit: ${limit})...`);

    let rawList: any[] = [];
    try {
      const res = await this.getCustomers({ perpage: limit });
      if (Array.isArray(res)) {
        rawList = res;
      } else if (res?.data && Array.isArray(res.data)) {
        rawList = res.data;
      }
    } catch (err: any) {
      this.logger.error(`[Jetpack Sync] Failed to fetch customers from Jetpack CRM: ${err.message}`);
      return {
        success: false,
        totalFetched: 0,
        customersCreated: 0,
        leadsCreated: 0,
        updated: 0,
        skipped: 0,
        errors: [err.message],
        timestamp: new Date().toISOString(),
      };
    }

    let customersCreated = 0;
    let leadsCreated = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const c of rawList) {
      try {
        const rawEmail = (c.email || '').trim().toLowerCase();
        // If email is empty, derive an identifier from id or name
        const email = rawEmail || `wp-contact-${c.id}@sunseekerstours.com`;
        const fname = (c.fname || c.fullname?.split(' ')[0] || 'Valued').trim();
        const lname = (c.lname || c.fullname?.split(' ').slice(1).join(' ') || (rawEmail ? rawEmail.split('@')[0] : 'Client')).trim();
        const phone = (c.mobtel || c.worktel || c.hometel || '').trim();
        const country = (c.country || '').trim();
        const address = [c.addr1, c.addr2, c.city, c.postcode].filter(Boolean).join(', ');
        const rawStatus = (c.status || 'New Lead').trim();
        const isCustomer = rawStatus.toLowerCase().includes('customer');
        const tour = (c.to || c.from || '').trim();
        const departure = (c.departure || c.departure_cfdate || '').trim();
        const passengers = (c.passengers || '').trim();
        const contactNotes = (c.notes || '').trim();

        // 1. Check if customer already exists in our DB
        let customer = await this.prisma.customer.findFirst({
          where: {
            OR: [
              ...(rawEmail ? [{ email: rawEmail }] : []),
              ...(phone ? [{ phone }] : []),
            ],
          },
        });

        if (!customer) {
          customer = await this.prisma.customer.create({
            data: {
              firstName: fname,
              lastName: lname,
              email: rawEmail || undefined,
              phone: phone || undefined,
              country: country || undefined,
              address: address || undefined,
              status: CustomerStatus.ACTIVE,
              leadSource: LeadSource.WEBSITE,
              tags: ['JETPACK_CRM', 'WORDPRESS_SYNC', rawStatus.toUpperCase().replace(/\s+/g, '_')],
            },
          });
          customersCreated++;

          // Attach initial note if WordPress tour/notes details exist
          const noteLines = [
            `🌐 Imported from WordPress Jetpack CRM (ID #${c.id})`,
            `Status in WP: ${rawStatus}`,
            tour ? `📍 Requested Destination / Tour: ${tour}` : null,
            departure ? `📅 Departure Date: ${departure}` : null,
            passengers ? `👥 Passengers: ${passengers}` : null,
            contactNotes ? `💬 Notes: ${contactNotes}` : null,
          ].filter(Boolean).join('\n');

          if (noteLines) {
            await this.prisma.note.create({
              data: {
                content: noteLines,
                customerId: customer.id,
              },
            });
          }
        } else {
          // Customer exists; ensure tagged as JETPACK_CRM
          const existingTags = customer.tags || [];
          if (!existingTags.includes('JETPACK_CRM')) {
            await this.prisma.customer.update({
              where: { id: customer.id },
              data: {
                tags: [...existingTags, 'JETPACK_CRM', 'WORDPRESS_SYNC'],
                phone: customer.phone || phone || undefined,
                country: customer.country || country || undefined,
              },
            });
            updated++;
          } else {
            skipped++;
          }
        }

        // 2. If it's a Lead or New Lead, ensure it exists in the Leads pipeline
        if (!isCustomer && rawEmail) {
          const existingLead = await this.prisma.lead.findFirst({
            where: { email: rawEmail },
          });

          if (!existingLead) {
            const lead = await this.prisma.lead.create({
              data: {
                firstName: fname,
                lastName: lname,
                email: rawEmail,
                phone: phone || undefined,
                source: LeadSource.WEBSITE,
                stage: LeadStage.NEW,
                destination: tour || undefined,
                interestedTour: tour || undefined,
                customerId: customer.id,
                campaign: 'WordPress Site Lead',
                tags: ['JETPACK_CRM', 'WORDPRESS_SYNC'],
                notes: {
                  create: {
                    content: `Inbound WordPress Lead (WP ID #${c.id})\n` +
                      (tour ? `• Tour: ${tour}\n` : '') +
                      (departure ? `• Departure: ${departure}\n` : '') +
                      (passengers ? `• Guests: ${passengers}\n` : '') +
                      (contactNotes ? `• Notes: ${contactNotes}` : ''),
                  },
                },
              },
            });

            leadsCreated++;

            // Run automated sales assignment & outreach task
            await this.salesAutomation.handleNewLead(lead).catch((err) => {
              this.logger.warn(`Automation error on imported lead: ${err?.message}`);
            });
          }
        }
      } catch (itemErr: any) {
        errors.push(`Contact ID ${c?.id}: ${itemErr.message}`);
      }
    }

    const summary: ImportSummary = {
      success: true,
      totalFetched: rawList.length,
      customersCreated,
      leadsCreated,
      updated,
      skipped,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`[Jetpack Sync] Complete: ${JSON.stringify(summary)}`);
    return summary;
  }

  /**
   * HANDLE INBOUND WORDPRESS FORM WEBHOOK SUBMISSION
   * Invoked in real time when any form on WordPress (Elementor, CF7, WPForms, Jetpack) is submitted.
   */
  async handleWordPressWebhook(payload: Record<string, any>): Promise<any> {
    this.logger.log(`[WordPress Webhook] Received form submission: ${JSON.stringify(payload).slice(0, 300)}`);

    // Flexible extraction from various WordPress form plugins
    const email = (
      payload.email ||
      payload['your-email'] ||
      payload.user_email ||
      payload['Email'] ||
      payload.contact_email ||
      payload.fields?.email ||
      payload.data?.email ||
      ''
    ).trim().toLowerCase();

    if (!email) {
      return { success: false, message: 'No valid email address found in form submission' };
    }

    const fullName = (
      payload.fullName ||
      payload.name ||
      payload['your-name'] ||
      payload['Name'] ||
      payload.full_name ||
      payload.fields?.name ||
      payload.data?.name ||
      ''
    ).trim();

    let fname = (
      payload.fname ||
      payload.firstName ||
      payload.first_name ||
      payload['first-name'] ||
      payload['First Name'] ||
      payload['first_name'] ||
      payload.fields?.first_name ||
      payload.fields?.fname ||
      ''
    ).trim();
    let lname = (
      payload.lname ||
      payload.lastName ||
      payload.last_name ||
      payload['last-name'] ||
      payload['Last Name'] ||
      payload['last_name'] ||
      payload.fields?.last_name ||
      payload.fields?.lname ||
      ''
    ).trim();

    if (!fname && fullName) {
      const parts = fullName.split(' ');
      fname = parts[0] || 'Web';
      lname = parts.slice(1).join(' ') || 'Customer';
    } else if (!fullName && (fname || lname)) {
      // populate fullName if first/last were provided
    }

    if (!fname) fname = 'Website';
    if (!lname) lname = 'Visitor';

    const phone = (
      payload.phone ||
      payload.mobtel ||
      payload['your-tel'] ||
      payload.tel ||
      payload['Phone'] ||
      payload.telephone ||
      payload.fields?.phone ||
      ''
    ).trim();

    const tour = (
      payload.tour ||
      payload.interestedTour ||
      payload.serviceType ||
      payload.destination ||
      payload.subject ||
      payload['your-subject'] ||
      payload.package ||
      ''
    ).trim();

    const departure = (
      payload.departure ||
      payload.startDate ||
      payload.date ||
      payload['travel-date'] ||
      ''
    ).trim();

    const guests = (
      payload.guests ||
      payload.passengers ||
      payload.pax ||
      payload['number-of-guests'] ||
      ''
    ).trim();

    const message = (
      payload.message ||
      payload.comments ||
      payload.notes ||
      payload['your-message'] ||
      payload.details ||
      ''
    ).trim();

    // 1. Run Duplicate Detection
    const dup = await this.salesAutomation.detectDuplicate({ email, phone });

    // 2. Create or Update Customer
    let customerId = dup.existingCustomerId;
    if (!customerId) {
      const newCustomer = await this.prisma.customer.create({
        data: {
          firstName: fname,
          lastName: lname,
          email,
          phone: phone || undefined,
          leadSource: LeadSource.WEBSITE,
          status: CustomerStatus.ACTIVE,
          tags: ['WORDPRESS_FORM', 'WEBSITE_REQUEST', 'JETPACK_CRM'],
        },
      });
      customerId = newCustomer.id;
    }

    // 3. Create Lead in Pipeline
    const tags = ['WORDPRESS_FORM', 'WEBSITE_REQUEST'];
    if (dup.isDuplicate) tags.push('EXISTING_CUSTOMER');
    if (tour) tags.push(tour.toUpperCase().replace(/\s+/g, '_'));

    const leadNoteContent = [
      `🌐 Real-Time Inbound WordPress Form Submission:`,
      fullName ? `• Name: ${fullName}` : null,
      email ? `• Email: ${email}` : null,
      phone ? `• Phone: ${phone}` : null,
      tour ? `• Requested Tour / Service: ${tour}` : null,
      departure ? `• Travel Date: ${departure}` : null,
      guests ? `• Guests / Passengers: ${guests}` : null,
      message ? `• Message: ${message}` : null,
      dup.isDuplicate ? `⚠️ Match found with existing customer profile (${dup.existingCustomerName})` : null,
    ].filter(Boolean).join('\n');

    const lead = await this.prisma.lead.create({
      data: {
        firstName: fname,
        lastName: lname,
        email,
        phone: phone || undefined,
        source: LeadSource.WEBSITE,
        stage: LeadStage.NEW,
        destination: tour || undefined,
        interestedTour: tour || undefined,
        customerId,
        assignedUserId: dup.assignedStaffId,
        campaign: 'WordPress Inbound Webhook',
        tags,
        notes: {
          create: {
            content: leadNoteContent,
          },
        },
      },
    });

    // 4. Run Sales Automations (Round-robin assignment, 2-hour outreach task)
    await this.salesAutomation.handleNewLead(lead).catch((err) => {
      this.logger.warn(`Sales automation error for WordPress form webhook: ${err?.message}`);
    });

    // 5. Send Telegram alert with custom header
    await this.telegram.sendAlert(
      `📥 <b>NEW WORDPRESS FORM SUBMISSION</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Name:</b> ${fname} ${lname}\n` +
      `📧 <b>Email:</b> ${email}\n` +
      `📞 <b>Phone:</b> ${phone || 'Not provided'}\n` +
      `🎒 <b>Tour/Interest:</b> ${tour || 'General Inquiry'}\n` +
      (message ? `💬 <b>Message:</b> <i>"${message.slice(0, 150)}"</i>\n` : '') +
      `👉 <a href="http://localhost:3001/leads">View in Staff CRM</a>`
    ).catch(() => {});

    // 6. Asynchronously push contact back to Jetpack CRM if not already from there
    void this.syncContact({
      email,
      fname,
      lname,
      status: 'New Lead',
      mobtel: phone,
      tags: ['WORDPRESS_FORM_WEBHOOK', 'SUNSEEKER_APP'],
      notes: leadNoteContent,
    }).catch(() => {});

    return {
      success: true,
      message: 'WordPress form inquiry received and synced to Sunseeker CRM',
      leadId: lead.id,
      customerId,
    };
  }
}
