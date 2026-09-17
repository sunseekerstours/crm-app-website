import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@app/config/configuration';

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

@Injectable()
export class JetpackCrmService {
  private readonly logger = new Logger(JetpackCrmService.name);

  private readonly enabled: boolean;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly config: ConfigService<AppConfig>) {
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
          rejectUnauthorized: false,
          timeout: 30000,
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
        reject(new Error('Jetpack CRM connection timed out after 30s'));
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
      return await this.request('status/', 'GET', undefined, full ? { full: 1 } : {});
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync a contact / lead to Jetpack CRM
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
      this.logger.error(`Failed to sync contact ${contact.email} to Jetpack CRM: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * List customers from Jetpack CRM
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
}
