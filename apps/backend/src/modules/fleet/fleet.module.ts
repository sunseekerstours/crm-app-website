import { Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { PrismaModule } from '@app/prisma/prisma.module';
import { AuditModule } from '@app/modules/audit/audit.module';

import { InvoicesModule } from '@app/modules/invoices/invoices.module';
import { QuotesModule } from '@app/modules/quotes/quotes.module';

@Module({
  imports: [PrismaModule, AuditModule, InvoicesModule, QuotesModule],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}
