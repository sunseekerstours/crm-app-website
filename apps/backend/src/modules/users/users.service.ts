import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiConflictException, ApiNotFoundException, ErrorCode } from '@app/common/errors';
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

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new ApiNotFoundException(ErrorCode.ROLE_NOT_FOUND, 'Role not found');

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

    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
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

  private sanitize(user: User & { roles?: Array<{ role: { id: string; name: string } }> }) {
    const { passwordHash, ...rest } = user;
    void passwordHash;
    return {
      ...rest,
      roles: user.roles?.map((r) => ({ id: r.role.id, name: r.role.name })) ?? [],
    };
  }
}
