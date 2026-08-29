import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { AuditableAction } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateCompanyDto, ctx: RequestContext) {
    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        website: dto.website,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        country: dto.country,
        accountManagerId: dto.accountManagerId,
        industry: dto.industry,
        notes: dto.notes,
        ...(dto.contacts?.length ? { contacts: { create: dto.contacts } } : {}),
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.COMPANY_CREATED,
      entityType: 'Company',
      entityId: company.id,
      after: { name: company.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return company;
  }

  async findAll(params: { page: number; limit: number; search?: string }) {
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { contacts: true, _count: { select: { customers: true } } },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      paginated: true as const,
    };
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        contacts: true,
        customers: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!company) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found');
    }
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, ctx: RequestContext) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found');
    }
    const updated = await this.prisma.company.update({ where: { id }, data: { ...dto } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.COMPANY_UPDATED,
      entityType: 'Company',
      entityId: id,
      before: { name: existing.name },
      after: { name: updated.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async addContact(companyId: string, dto: CreateContactDto, ctx: RequestContext) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found');
    }
    const contact = await this.prisma.contact.create({
      data: { ...dto, companyId },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CONTACT_CREATED,
      entityType: 'Contact',
      entityId: contact.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return contact;
  }

  async updateContact(
    companyId: string,
    contactId: string,
    dto: UpdateContactDto,
    ctx: RequestContext,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, companyId },
    });
    if (!contact) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Contact not found');
    }
    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: { ...dto },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CONTACT_UPDATED,
      entityType: 'Contact',
      entityId: contactId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async removeContact(companyId: string, contactId: string, ctx: RequestContext) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, companyId },
    });
    if (!contact) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Contact not found');
    }
    await this.prisma.contact.delete({ where: { id: contactId } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.CONTACT_DELETED,
      entityType: 'Contact',
      entityId: contactId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Company not found');
    }
    await this.prisma.company.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.COMPANY_DELETED,
      entityType: 'Company',
      entityId: id,
      before: { name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
