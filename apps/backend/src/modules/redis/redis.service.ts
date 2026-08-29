import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    const host = config.get<string>('redis.host');
    this.enabled = Boolean(host);
    if (this.enabled) {
      this.connect(config, host as string, config.get<number>('redis.port') ?? 6379);
    } else {
      this.logger.warn('Redis not configured; running without cache/queue');
    }
  }

  private connect(config: ConfigService, host: string, port: number): void {
    this.client = new Redis({ host, port, lazyConnect: true, maxRetriesPerRequest: 1 });
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    this.client.connect().catch(() => {
      this.logger.warn(
        'Redis connection unavailable. Continuing without Redis (graceful degradation).',
      );
    });
  }

  get isConnected(): boolean {
    return Boolean(this.client?.status === 'ready');
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  async getClient(): Promise<Redis | null> {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
