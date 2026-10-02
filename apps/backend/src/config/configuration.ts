export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
  };
  bcryptSaltRounds: number;
  passwordResetTtl: number;
  redis: {
    host: string;
    port: number;
  };
  automation: {
    enabled: boolean;
    intervalMs: number;
    reminderWindowDays: number;
    staleLeadDays: number;
    invoiceOverdueDays: number;
  };
  log: {
    level: string;
    json: boolean;
  };
  corsOrigins: string[];
  rateLimit: {
    ttl: number;
    max: number;
  };
  admin: {
    email: string;
    password: string;
  };
  jetpackCrm: {
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    apiSecret: string;
    /** Max contacts to pull per sync run (paginated internally). */
    syncLimit: number;
    /** Page size requested from the Jetpack customers endpoint. */
    pageSize: number;
    /** Shared secret required by the public WordPress webhook. */
    webhookSecret: string;
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
    replyTo?: string;
  };
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'insecure-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'insecure-refresh-secret',
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10),
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
  passwordResetTtl: parseInt(process.env.PASSWORD_RESET_TTL ?? '3600', 10),
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  automation: {
    enabled: process.env.AUTOMATION_ENABLED === 'true',
    intervalMs: parseInt(process.env.AUTOMATION_INTERVAL_MS ?? '3600000', 10),
    reminderWindowDays: parseInt(process.env.AUTOMATION_REMINDER_WINDOW_DAYS ?? '3', 10),
    staleLeadDays: parseInt(process.env.AUTOMATION_STALE_LEAD_DAYS ?? '7', 10),
    invoiceOverdueDays: parseInt(process.env.AUTOMATION_INVOICE_OVERDUE_DAYS ?? '1', 10),
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
    json: process.env.LOG_JSON === 'true',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '120', 10),
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@sunseeker.local',
    password: process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
  },
  jetpackCrm: {
    enabled: process.env.JETPACK_CRM_ENABLED === 'true',
    endpoint: process.env.JETPACK_CRM_ENDPOINT ?? 'https://sunseekerstours.com/zbs_api/',
    apiKey: process.env.JETPACK_CRM_API_KEY ?? '',
    apiSecret: process.env.JETPACK_CRM_API_SECRET ?? '',
    syncLimit: parseInt(process.env.JETPACK_CRM_SYNC_LIMIT ?? '200', 10),
    pageSize: parseInt(process.env.JETPACK_CRM_PAGE_SIZE ?? '100', 10),
    webhookSecret: process.env.JETPACK_CRM_WEBHOOK_SECRET ?? '',
  },
  telegram: {
    enabled: process.env.TELEGRAM_ENABLED === 'true',
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },
  smtp: {
    enabled: process.env.SMTP_ENABLED === 'true' || Boolean(process.env.SMTP_HOST),
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Sunseekers Tours <noreply@sunseekerstours.com>',
    replyTo: process.env.SMTP_REPLY_TO ?? '',
  },
});
