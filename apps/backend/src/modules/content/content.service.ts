import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { slugify } from '@app/common/slugify';
import { ApiNotFoundException, ApiConflictException, ApiBadRequestException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';
import { Prisma, AuditableAction, PageStatus } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPage(dto: CreatePageDto, ctx: RequestContext) {
    const slug = dto.slug ?? slugify(dto.title);
    const exists = await this.prisma.page.findUnique({ where: { slug } });
    if (exists) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'A page with this slug already exists');
    }

    const page = await this.prisma.page.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        body: (dto.body ?? {}) as Prisma.InputJsonValue,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        status: dto.status ?? PageStatus.DRAFT,
        publishedAt: dto.status === PageStatus.PUBLISHED ? new Date() : null,
        createdById: ctx.userId ?? null,
        updatedById: ctx.userId ?? null,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PAGE_CREATED,
      entityType: 'Page',
      entityId: page.id,
      after: { slug: page.slug, title: page.title },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return page;
  }

  async findPages(params: { page: number; limit: number; search?: string; status?: PageStatus }) {
    const where: Prisma.PageWhereInput = {};
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.page.count({ where }),
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

  async findPageById(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Page not found');
    return page;
  }

  async updatePage(id: string, dto: UpdatePageDto, ctx: RequestContext) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Page not found');

    if (dto.slug && dto.slug !== existing.slug) {
      const taken = await this.prisma.page.findUnique({ where: { slug: dto.slug } });
      if (taken) {
        throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'Page slug already in use');
      }
    }

    const updated = await this.prisma.page.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        body: dto.body as Prisma.InputJsonValue | undefined,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        status: dto.status,
        publishedAt: dto.status === PageStatus.PUBLISHED && existing.status !== PageStatus.PUBLISHED
          ? new Date()
          : undefined,
        updatedById: ctx.userId ?? null,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PAGE_UPDATED,
      entityType: 'Page',
      entityId: id,
      before: { slug: existing.slug, title: existing.title },
      after: { slug: updated.slug, title: updated.title },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async removePage(id: string, ctx: RequestContext) {
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Page not found');

    await this.prisma.page.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PAGE_DELETED,
      entityType: 'Page',
      entityId: id,
      before: { slug: existing.slug, title: existing.title },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }

  async listSiteSettings() {
    return this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async updateSiteSetting(key: string, dto: UpdateSiteSettingDto, ctx: RequestContext) {
    if (dto.value === undefined && dto.valueJson === undefined && dto.description === undefined && dto.isPublic === undefined) {
      throw new ApiBadRequestException(ErrorCode.BAD_REQUEST, 'No update fields provided');
    }

    const existing = await this.prisma.siteSetting.findUnique({ where: { key } });
    let setting;
    if (!existing) {
      setting = await this.prisma.siteSetting.create({
        data: {
          key,
          value: dto.value,
          valueJson: dto.valueJson as Prisma.InputJsonValue | undefined,
          description: dto.description,
          isPublic: dto.isPublic ?? false,
        },
      });
    } else {
      setting = await this.prisma.siteSetting.update({
        where: { key },
        data: {
          value: dto.value,
          valueJson: dto.valueJson as Prisma.InputJsonValue | undefined,
          description: dto.description,
          isPublic: dto.isPublic,
        },
      });
    }

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.SITE_SETTING_UPDATED,
      entityType: 'SiteSetting',
      entityId: key,
      after: { key, value: setting.value },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return setting;
  }
}
