import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { Permission } from '@app/common/permissions';
import { ListQueryDto } from '@app/common/dto/list-query.dto';
import { toRequestContext } from '@app/common/request-context';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @RequirePermissions(Permission.COMPANY_CREATE)
  create(@Body() dto: CreateCompanyDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.companiesService.create(dto, toRequestContext(req, userId));
  }

  @Get()
  @RequirePermissions(Permission.COMPANY_VIEW)
  findAll(@Query() query: ListQueryDto) {
    return this.companiesService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.COMPANY_VIEW)
  findById(@Param('id') id: string) {
    return this.companiesService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COMPANY_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.update(id, dto, toRequestContext(req, userId));
  }

  @Delete(':id')
  @RequirePermissions(Permission.COMPANY_DELETE)
  remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') userId: string) {
    return this.companiesService.remove(id, toRequestContext(req, userId));
  }

  @Post(':id/contacts')
  @RequirePermissions(Permission.CONTACT_CREATE)
  addContact(
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.addContact(id, dto, toRequestContext(req, userId));
  }

  @Patch(':id/contacts/:contactId')
  @RequirePermissions(Permission.CONTACT_UPDATE)
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.updateContact(id, contactId, dto, toRequestContext(req, userId));
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermissions(Permission.CONTACT_DELETE)
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Req() req: Request,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.removeContact(id, contactId, toRequestContext(req, userId));
  }
}
