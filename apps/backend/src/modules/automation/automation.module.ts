import { Module } from '@nestjs/common';
import { NotificationsModule } from '@app/modules/notifications/notifications.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
