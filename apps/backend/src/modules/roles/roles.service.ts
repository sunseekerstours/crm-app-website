import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number }) {
    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'asc' },
        include: { permissions: { include: { permission: true } } },
      }),
      this.prisma.role.count(),
    ]);

    return {
      items: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions.map((p) => ({ id: p.permission.id, key: p.permission.key })),
      })),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      paginated: true as const,
    };
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new ApiNotFoundException(ErrorCode.ROLE_NOT_FOUND, 'Role not found');
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((p) => ({
        id: p.permission.id,
        key: p.permission.key,
      })),
    };
  }
}
