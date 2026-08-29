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
});
