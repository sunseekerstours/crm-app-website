import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { RedisService } from '@app/modules/redis/redis.service';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  checks: {
    database: string;
    redis: string;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthStatus> {
    let dbOk = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }

    const redisOk = await this.redis.ping();
    const database = dbOk ? 'up' : 'down';
    const redis = redisOk ? 'up' : 'down';
    const status: HealthStatus['status'] = dbOk ? (redisOk ? 'ok' : 'degraded') : 'down';

    return {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }
}
