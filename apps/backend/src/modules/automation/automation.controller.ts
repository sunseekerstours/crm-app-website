import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { AutomationService } from './automation.service';

@ApiTags('automation')
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly config: ConfigService,
  ) {}

  @Post('reminders/run')
  @RequirePermissions(Permission.AUTOMATION_RUN)
  run() {
    return this.automationService.run();
  }

  @Get('status')
  @RequirePermissions(Permission.AUTOMATION_VIEW)
  status() {
    return {
      enabled: this.config.get<boolean>('automation.enabled'),
      intervalMs: this.config.get<number>('automation.intervalMs'),
      reminderWindowDays: this.config.get<number>('automation.reminderWindowDays'),
      staleLeadDays: this.config.get<number>('automation.staleLeadDays'),
    };
  }
}
