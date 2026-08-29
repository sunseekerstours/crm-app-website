import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { PrismaService } from '@app/prisma/prisma.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';

@ApiTags('timeline')
@Controller('timeline')
export class TimelineController {
  constructor(private readonly prisma: PrismaService) {}

  /** Customer 360 timeline (PRD §24, §96). scope: CUSTOMER | LEAD | DEAL */
  @Get(':entityType/:entityId')
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  async getTimeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const scope = entityType.toUpperCase();
    if (!['CUSTOMER', 'LEAD', 'DEAL'].includes(scope)) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Unknown timeline scope');
    }

    const take = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;

    const items = await this.prisma.timelineEvent.findMany({
      where: {
        entityType: scope,
        entityId,
        ...(before ? { occurredAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take,
      include: { actor: { select: { id: true, firstName: true, lastName: true } } },
    });

    return { items, entityType: scope, entityId };
  }
}
