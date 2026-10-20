import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AuditModule } from '@app/modules/audit/audit.module';
import { NotificationsModule } from '@app/modules/notifications/notifications.module';
import { TelegramModule } from '@app/modules/telegram/telegram.module';

@Module({
  imports: [AuditModule, NotificationsModule, TelegramModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
