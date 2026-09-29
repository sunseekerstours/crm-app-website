import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiBadRequestException, ApiConflictException, ApiForbiddenException, ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { SUPER_ADMIN_ROLE, isSubsetOf, resolvePermissions } from '@app/common/rbac';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { User, AuditableAction } from '@prisma/client';
import { RequestContextMeta } from '@app/modules/auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateUserDto, meta: RequestContextMeta) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiConflictException(ErrorCode.EMAIL_IN_USE, 'Email is already in use');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.get<number>('bcryptSaltRounds') ?? 10,
    );

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status ?? 'ACTIVE',
        ...(dto.roleIds?.length
          ? {
              roles: {
                create: dto.roleIds.map((roleId) => ({ roleId })),
              },
            }
          : {}),
      },
    });

    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, status: user.status },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.sanitize(user);
  }

  async findAll(params: { page: number; limit: number }) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: users.map((u) => this.sanitize(u)),
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      paginated: true as const,
    };
  }

  async findById(id: string, meta: RequestContextMeta) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');
    }
    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.USER_UPDATED,
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, meta: RequestContextMeta) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, this.config.get<number>('bcryptSaltRounds') ?? 10)
      : undefined;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status,
        ...(passwordHash ? { passwordHash } : {}),
      },
      include: { roles: { include: { role: true } } },
    });

    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.USER_UPDATED,
      entityType: 'User',
      entityId: id,
      before: { status: user.status },
      after: { status: updated.status },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.sanitize(updated);
  }

  async assignRole(userId: string, dto: AssignRoleDto, meta: RequestContextMeta) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new ApiNotFoundException(ErrorCode.ROLE_NOT_FOUND, 'Role not found');

    await this.assertCanAssign(meta, role.name, role.permissions.map((p) => p.permission.key));

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: dto.roleId } },
      create: { userId, roleId: dto.roleId },
      update: {},
    });

    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.USER_ROLE_ASSIGNED,
      entityType: 'User',
      entityId: userId,
      after: { role: role.name },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { success: true };
  }

  async removeRole(userId: string, roleId: string, meta: RequestContextMeta) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (role?.name === SUPER_ADMIN_ROLE) {
      if (userId === meta.userId) {
        throw new ApiBadRequestException(
          ErrorCode.BAD_REQUEST,
          'You cannot remove your own SUPER_ADMIN role',
        );
      }
      await this.assertNotLastSuperAdmin(userId);
    }

    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });

    await this.audit.record({
      userId: meta.userId,
      action: AuditableAction.USER_ROLE_REMOVED,
      entityType: 'User',
      entityId: userId,
      after: { role: role?.name ?? roleId },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { success: true };
  }

  /** Blocks granting a role that carries permissions the actor does not hold. */
  private async assertCanAssign(
    meta: RequestContextMeta,
    roleName: string,
    rolePermissionKeys: string[],
  ) {
    if (!meta.userId) {
      throw new ApiForbiddenException(ErrorCode.PERMISSION_DENIED, 'Permission denied');
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: meta.userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!actor) throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');

    const actorPermissions = resolvePermissions(
      actor.roles.map((r) => r.role.name),
      actor.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)),
    );

    if (!isSubsetOf(rolePermissionKeys, actorPermissions)) {
      throw new ApiForbiddenException(
        ErrorCode.PERMISSION_DENIED,
        `You cannot assign ${roleName} because it grants permissions you do not have`,
      );
    }
  }

  /** Prevents removing the final SUPER_ADMIN, which would lock everyone out. */
  private async assertNotLastSuperAdmin(excludingUserId: string) {
    const superAdminRole = await this.prisma.role.findUnique({ where: { name: SUPER_ADMIN_ROLE } });
    if (!superAdminRole) return;

    const holders = await this.prisma.userRole.count({
      where: { roleId: superAdminRole.id, userId: { not: excludingUserId } },
    });
    if (holders === 0) {
      throw new ApiBadRequestException(
        ErrorCode.BAD_REQUEST,
        'At least one user must keep the SUPER_ADMIN role',
      );
    }
  }

  private sanitize(user: User & { roles?: Array<{ role: { id: string; name: string } }> }) {
    const { passwordHash, ...rest } = user;
    void passwordHash;
    return {
      ...rest,
      roles: user.roles?.map((r) => ({ id: r.role.id, name: r.role.name })) ?? [],
    };
  }
}
