import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { MailService } from './mail.service';
import { SendTestEmailDto } from './dto/send-test-email.dto';

@ApiTags('mail')
@ApiBearerAuth()
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('status')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: 'Check external SMTP connection and configuration status' })
  getStatus() {
    return this.mailService.getStatus();
  }

  @Post('test')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({ summary: 'Send a test email using configured SMTP provider' })
  async sendTest(@Body() dto: SendTestEmailDto) {
    const result = await this.mailService.sendMail({
      to: dto.to,
      subject: '[Sunseekers CRM] SMTP Test Email Verification',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #ea580c;">SMTP Mailer Verification Successful</h2>
          <p>Your external SMTP email server is correctly configured and working for Sunseekers Tours & Travel CRM.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return {
      success: true,
      message: `Test email dispatched to ${dto.to}`,
      result,
    };
  }
}
