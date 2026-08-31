import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { slugify } from '@app/common/slugify';
import { ApiNotFoundException, ApiConflictException, ErrorCode } from '@app/common/errors';
import { RequestContext } from '@app/common/request-context';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, AuditableAction } from '@prisma/client';

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(base);
    let slug = baseSlug;
    let n = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${baseSlug}-${n}`;
      n += 1;
    }
  }

  async create(dto: CreateProductDto, ctx: RequestContext) {
    const slug = dto.slug ? slugify(dto.slug) : await this.uniqueSlug(dto.name);
    const taken = await this.prisma.product.findUnique({ where: { slug } });
    if (taken) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'A product with this slug already exists');
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        category: dto.category,
        description: dto.description,
        price: dto.price ? new Prisma.Decimal(dto.price) : undefined,
        currency: dto.currency ?? 'GHS',
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PRODUCT_CREATED,
      entityType: 'Product',
      entityId: product.id,
      after: { name: product.name, slug: product.slug, category: product.category },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return product;
  }

  async findAll(params: ListParams) {
    const where: Prisma.ProductWhereInput = {};
    if (params.category) where.category = params.category;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { customers: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => ({ ...p, price: p.price != null ? Number(p.price) : null })),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      paginated: true as const,
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        customers: { include: { customer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!product) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Product not found');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, ctx: RequestContext) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Product not found');
    }

    let slug: string | undefined;
    if (dto.slug) {
      slug = slugify(dto.slug);
      const taken = await this.prisma.product.findUnique({ where: { slug } });
      if (taken && taken.id !== id) {
        throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'A product with this slug already exists');
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        category: dto.category,
        description: dto.description,
        price: dto.price ? new Prisma.Decimal(dto.price) : undefined,
        currency: dto.currency,
        isActive: dto.isActive,
      },
    });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PRODUCT_UPDATED,
      entityType: 'Product',
      entityId: id,
      before: { name: existing.name },
      after: { name: updated.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Product not found');
    }

    await this.prisma.product.delete({ where: { id } });

    await this.audit.record({
      userId: ctx.userId,
      action: AuditableAction.PRODUCT_DELETED,
      entityType: 'Product',
      entityId: id,
      before: { name: existing.name },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    return { success: true };
  }
}
