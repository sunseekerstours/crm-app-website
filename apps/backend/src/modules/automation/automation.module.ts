import { Module, Global } from '@nestjs/common';
import { NotificationsModule } from '@app/modules/notifications/notifications.module';
import { TimelineModule } from '@app/modules/timeline/timeline.module';
import { TelegramModule } from '@app/modules/telegram/telegram.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { SalesAutomationService } from './sales-automation.service';

@Global()
@Module({
  imports: [NotificationsModule, TimelineModule, TelegramModule],
  controllers: [AutomationController],
  providers: [AutomationService, SalesAutomationService],
  exports: [AutomationService, SalesAutomationService],
})
export class AutomationModule {}
