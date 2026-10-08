import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';

import { IsOptional, IsString } from 'class-validator';

class TestTelegramDto {
  @IsOptional()
  @IsString()
  botToken?: string;

  @IsOptional()
  @IsString()
  chatId?: string;
}

@ApiTags('telegram')
@ApiBearerAuth()
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('status')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  async getStatus() {
    const config = await this.telegramService.getConfig();
    return {
      enabled: config.enabled,
      chatIdConfigured: Boolean(config.chatId),
      botTokenConfigured: Boolean(config.botToken),
      maskedToken: config.botToken
        ? `${config.botToken.slice(0, 4)}...${config.botToken.slice(-4)}`
        : null,
      chatId: config.chatId || null,
    };
  }

  @Post('test')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async testBot(@Body() dto: TestTelegramDto) {
    return this.telegramService.testConnection(dto.botToken, dto.chatId);
  }

  @Post('test-alert')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async sendSampleAlert() {
    await this.telegramService.sendNewLeadAlert({
      id: 'sample-test-lead',
      firstName: 'Kwame',
      lastName: 'Mensah',
      email: 'kwame.mensah@example.com',
      phone: '+233 24 123 4567',
      source: 'Website - Direct Tour Inquiry',
      destination: 'Ghana Heritage & Cape Coast',
      interestedTour: '7-Day Culture & Canopy Walk Adventure',
      assignedStaffName: 'Sales Team',
      isDuplicate: false,
    });
    return { success: true, message: 'Sample lead alert posted to Telegram successfully!' };
  }
}
