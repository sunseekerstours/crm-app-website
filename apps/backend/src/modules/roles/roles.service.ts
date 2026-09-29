import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import {
  ApiBadRequestException,
  ApiConflictException,
  ApiForbiddenException,
  ApiNotFoundException,
  ErrorCode,
} from '@app/common/errors';
import { ALL_PERMISSIONS } from '@app/common/permissions';
import {
  SUPER_ADMIN_ROLE,
  isSubsetOf,
  resolvePermissions,
  unknownPermissions,
} from '@app/common/rbac';
import { RequestContextMeta } from '@app/modules/auth/auth.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { AuditableAction } from '@prisma/client';

const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Full permission catalog, grouped for the admin permission matrix. */
  listPermissions() {
    const groups = new Map<string, string[]>();
    for (const key of ALL_PERMISSIONS) {
      const group = key.split('.')[0]!;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(key);
    }
    return {
      total: ALL_PERMISSIONS.length,
      groups: Array.from(groups.entries())
        .map(([group, keys]) => ({ group, keys: keys.sort() }))
        .sort((a, b) => a.group.localeCompare(b.group)),
      keys: [...ALL_PERMISSIONS],
    };
  }

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
      items: roles.map((r) => this.serialize(r)),
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
    return this.serialize(role);
  }

  async create(dto: CreateRoleDto, meta: RequestContextMeta) {
    const name = this.normalizeName(dto.name);
    const actor = await this.actorPermissions(meta);
    const permissionKeys = this.validatePermissions(dto.permissionKeys ?? [], actor);

    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) {
      throw new ApiConflictException(ErrorCode.BAD_REQUEST, 'A role with that name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description,
        isSystem: false,
        permissions: {
          create: permissionKeys.map((key) => ({ permission: { connect: { key } } })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });

    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.ROLE_CREATED,
      entityType: 'Role',
      entityId: role.id,
      after: { name: role.name, description: role.description, permissionKeys },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.serialize(role);
  }

  async update(id: string, dto: UpdateRoleDto, meta: RequestContextMeta) {
    const role = await this.requireRole(id);

    const data: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined) {
      const name = this.normalizeName(dto.name);
      if (name !== role.name && role.isSystem) {
        throw new ApiBadRequestException(
          ErrorCode.BAD_REQUEST,
          'System role names cannot be changed',
        );
      }
      if (name !== role.name) {
        const clash = await this.prisma.role.findUnique({ where: { name } });
        if (clash) {
          throw new ApiConflictException(
            ErrorCode.BAD_REQUEST,
            'A role with that name already exists',
          );
        }
      }
      data.name = name;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data,
      include: { permissions: { include: { permission: true } } },
    });

    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.ROLE_UPDATED,
      entityType: 'Role',
      entityId: id,
      before: { name: role.name, description: role.description },
      after: { name: updated.name, description: updated.description },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.serialize(updated);
  }

  async setPermissions(id: string, dto: SetRolePermissionsDto, meta: RequestContextMeta) {
    const role = await this.requireRole(id);

    if (role.name === SUPER_ADMIN_ROLE) {
      throw new ApiBadRequestException(
        ErrorCode.BAD_REQUEST,
        'SUPER_ADMIN always has every permission and cannot be limited',
      );
    }

    const actor = await this.actorPermissions(meta);
    const permissionKeys = this.validatePermissions(dto.permissionKeys, actor);

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      ...permissionKeys.map((key) =>
        this.prisma.rolePermission.create({
          data: { role: { connect: { id } }, permission: { connect: { key } } },
        }),
      ),
    ]);

    const beforeKeys = role.permissions.map((p) => p.permission.key);
    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.ROLE_PERMISSIONS_UPDATED,
      entityType: 'Role',
      entityId: id,
      before: { name: role.name, permissionKeys: beforeKeys },
      after: { name: role.name, permissionKeys },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.findById(id);
  }

  async remove(id: string, meta: RequestContextMeta) {
    const role = await this.requireRole(id);

    if (role.isSystem) {
      throw new ApiBadRequestException(ErrorCode.BAD_REQUEST, 'System roles cannot be deleted');
    }

    const assigned = await this.prisma.userRole.count({ where: { roleId: id } });
    if (assigned > 0) {
      throw new ApiConflictException(
        ErrorCode.BAD_REQUEST,
        'Remove this role from all users before deleting it',
      );
    }

    await this.prisma.role.delete({ where: { id } });

    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.ROLE_DELETED,
      entityType: 'Role',
      entityId: id,
      before: { name: role.name, description: role.description },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { success: true };
  }

  /**
   * Effective permissions of the acting user. SUPER_ADMIN resolves to the full
   * catalog so an admin can manage every role and permission.
   */
  private async actorPermissions(meta: RequestContextMeta): Promise<string[]> {
    if (!meta.userId) {
      throw new ApiForbiddenException(ErrorCode.PERMISSION_DENIED, 'Permission denied');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: meta.userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user) {
      throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');
    }
    const roleNames = user.roles.map((r) => r.role.name);
    return resolvePermissions(
      roleNames,
      user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)),
    );
  }

  /** Rejects unknown keys and any key the actor cannot itself grant. */
  private validatePermissions(keys: string[], actorPermissions: string[]): string[] {
    const unique = Array.from(new Set(keys));

    const unknown = unknownPermissions(unique);
    if (unknown.length > 0) {
      throw new ApiBadRequestException(
        ErrorCode.VALIDATION_ERROR,
        'Unknown permission key',
        unknown,
      );
    }

    // For SUPER_ADMIN the actor set is the full catalog, so this always passes.
    if (!isSubsetOf(unique, actorPermissions)) {
      throw new ApiForbiddenException(
        ErrorCode.PERMISSION_DENIED,
        'You cannot grant a permission you do not have',
      );
    }

    return unique;
  }

  private normalizeName(raw: string): string {
    const name = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (!NAME_PATTERN.test(name)) {
      throw new ApiBadRequestException(
        ErrorCode.VALIDATION_ERROR,
        'Role name must be uppercase letters, digits and underscores',
      );
    }
    return name;
  }

  private async requireRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new ApiNotFoundException(ErrorCode.ROLE_NOT_FOUND, 'Role not found');
    return role;
  }

  private serialize(role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: Array<{ permission: { id: string; key: string } }>;
  }) {
    const granted = role.permissions.map((p) => p.permission.key);
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      // SUPER_ADMIN reports the full catalog so the admin matrix can show it as fully granted.
      effectivePermissionKeys: resolvePermissions([role.name], granted),
      permissionKeys: granted,
      permissions: role.permissions.map((p) => ({ id: p.permission.id, key: p.permission.key })),
    };
  }
}
