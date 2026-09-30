import { Body, Controller, ForbiddenException, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@app/common/decorators/public.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { JetpackContactInput, JetpackCrmService } from './jetpack-crm.service';

@ApiTags('jetpack-crm')
@Controller('jetpack-crm')
export class JetpackCrmController {
  constructor(private readonly jetpackService: JetpackCrmService) {}

  @Public()
  @Get('status')
  getStatus(@Query('full') full?: string) {
    return this.jetpackService.getStatus(full === '1' || full === 'true');
  }

  /**
   * Public webhook endpoint for WordPress forms (CF7, Elementor, WPForms, Jetpack Forms).
   * Requires the shared secret in the x-jetpack-webhook-secret header.
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Body() body: Record<string, any>,
    @Headers('x-jetpack-webhook-secret') secret?: string,
  ) {
    if (!this.jetpackService.verifyWebhookSecret(secret)) {
      throw new ForbiddenException('Invalid or missing webhook secret');
    }
    return this.jetpackService.handleWordPressWebhook(body);
  }

  /**
   * Trigger on-demand sync from Jetpack CRM to Sunseeker CRM
   */
  @ApiBearerAuth()
  @Post('sync')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async syncFromJetpack(@Body() body?: { limit?: number }) {
    return this.jetpackService.importFromJetpack({ limit: body?.limit });
  }

  /**
   * View raw contacts from Jetpack CRM
   */
  @ApiBearerAuth()
  @Get('contacts')
  @RequirePermissions(Permission.SETTINGS_VIEW)
  async getContacts(@Query('perpage') perpage?: string) {
    return this.jetpackService.getCustomers({ perpage: perpage ? parseInt(perpage, 10) : 50 });
  }

  @ApiBearerAuth()
  @Post('sync-test')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  syncTest(@Body() body: Partial<JetpackContactInput>) {
    const contact: JetpackContactInput = {
      email: body.email || `test-${Date.now()}@sunseekerstours.com`,
      fname: body.fname || 'Sunseeker',
      lname: body.lname || 'Web Lead',
      status: body.status || 'Lead',
      mobtel: body.mobtel || '',
      tags: body.tags || ['WEBSITE_REQUEST', 'MANUAL_TEST'],
      notes: body.notes || 'Test sync initiated from Sunseeker CRM API',
    };
    return this.jetpackService.syncContact(contact);
  }
}
