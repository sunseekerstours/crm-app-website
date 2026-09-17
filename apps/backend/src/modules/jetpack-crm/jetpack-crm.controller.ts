import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common/decorators/public.decorator';
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

  @Public()
  @Post('sync-test')
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
