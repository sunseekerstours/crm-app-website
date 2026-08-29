import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { ApiNotFoundException, ApiUnauthorizedException, ErrorCode } from '@app/common/errors';
import { LoginDto } from './dto/login.dto';
import { CompletePasswordResetDto } from './dto/complete-password-reset.dto';
import { User, UserStatus, AuditableAction } from '@prisma/client';

export interface RequestContextMeta {
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUserPayload {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  async login(
    dto: LoginDto,
    meta: RequestContextMeta,
  ): Promise<TokenPair & { user: AuthUserPayload }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      const message = 'Invalid email or password';
      await this.audit.record({
        action: AuditableAction.AUTH_LOGIN_FAILED,
        entityType: 'User',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        after: { email: dto.email },
      });
      throw new ApiUnauthorizedException(ErrorCode.INVALID_CREDENTIALS, message);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.audit.record({
        userId: user.id,
        action: AuditableAction.AUTH_LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new ApiUnauthorizedException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      await this.audit.record({
        userId: user.id,
        action: AuditableAction.AUTH_LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      throw new ApiUnauthorizedException(ErrorCode.ACCOUNT_SUSPENDED, 'Account is suspended');
    }
    if (user.status === UserStatus.DISABLED) {
      throw new ApiUnauthorizedException(ErrorCode.ACCOUNT_DISABLED, 'Account is disabled');
    }

    const payload = await this.buildUserPayload(user.id);
    const pair = await this.issueTokenPair(user, meta);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), status: UserStatus.ACTIVE },
    });

    await this.audit.record({
      userId: user.id,
      action: AuditableAction.AUTH_LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { ...pair, user: payload };
  }

  async refresh(refreshToken: string, meta: RequestContextMeta): Promise<TokenPair> {
    const tokenHash = this.sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new ApiUnauthorizedException(ErrorCode.INVALID_TOKEN, 'Invalid refresh token');
    }

    const user = stored.user;
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DISABLED) {
      throw new ApiUnauthorizedException(ErrorCode.ACCOUNT_DISABLED, 'Account is not active');
    }

    // Rotate: revoke old token, issue new one.
    const newPair = await this.issueTokenPair(user, meta, stored.id);

    return newPair;
  }

  async logout(refreshToken: string, meta: RequestContextMeta): Promise<{ success: boolean }> {
    const tokenHash = this.sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      await this.audit.record({
        userId: stored.userId,
        action: AuditableAction.AUTH_LOGOUT,
        entityType: 'RefreshToken',
        entityId: stored.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }
    return { success: true };
  }

  /** Revoke all refresh tokens for a user (logout from all devices). */
  async logoutAllForUser(userId: string, meta: RequestContextMeta): Promise<{ success: boolean }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      userId,
      action: AuditableAction.AUTH_LOGOUT,
      entityType: 'User',
      entityId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    return { success: true };
  }

  async requestPasswordReset(
    email: string,
    meta: RequestContextMeta,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return success to avoid revealing whether an email exists.
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + (this.config.get<number>('passwordResetTtl') ?? 3600) * 1000,
      );
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.sha256(rawToken),
          expiresAt,
        },
      });
      await this.audit.record({
        userId: user.id,
        action: AuditableAction.AUTH_PASSWORD_RESET_REQUESTED,
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      // NOTE: In production, send rawToken via email. Logged for dev convenience.
      console.log(`[DEV] Password reset token for ${user.email}: ${rawToken}`);
    }
    return { success: true };
  }

  async completePasswordReset(
    dto: CompletePasswordResetDto,
    meta: RequestContextMeta,
  ): Promise<{ success: boolean }> {
    const tokenHash = this.sha256(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ApiUnauthorizedException(ErrorCode.INVALID_TOKEN, 'Invalid or expired reset token');
    }

    const newHash = await bcrypt.hash(
      dto.newPassword,
      this.config.get<number>('bcryptSaltRounds') ?? 10,
    );
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash },
      }),
      // Invalidate all existing sessions after a password reset.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      userId: record.userId,
      action: AuditableAction.AUTH_PASSWORD_RESET_COMPLETED,
      entityType: 'User',
      entityId: record.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return { success: true };
  }

  async me(userId: string): Promise<AuthUserPayload> {
    return this.buildUserPayload(userId);
  }

  /** Builds the authenticated user payload including roles and permissions. */
  private async buildUserPayload(userId: string): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user) {
      throw new ApiNotFoundException(ErrorCode.USER_NOT_FOUND, 'User not found');
    }
    const roles = user.roles.map((r) => r.role.name);
    const permissions = Array.from(
      new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key))),
    );
    return { id: user.id, email: user.email, roles, permissions };
  }

  /** Issues an access + refresh token pair, storing the refresh token (rotated). */
  private async issueTokenPair(
    user: User,
    meta: RequestContextMeta,
    replacedByTokenId?: string,
  ): Promise<TokenPair> {
    const payload = await this.buildUserPayload(user.id);
    const accessTtl = this.config.get<number>('jwt.accessTtl') ?? 900;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl') ?? 604800;

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        roles: payload.roles,
        permissions: payload.permissions,
      },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: accessTtl,
      },
    );

    const rawRefreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.sha256(rawRefreshToken);
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    // If rotating, revoke the replaced token's chain.
    if (replacedByTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: replacedByTokenId },
        data: { revokedAt: new Date(), replacedByTokenId: null },
      });
    }

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        replacedByTokenId: replacedByTokenId ?? null,
      },
    });

    await this.audit.record({
      userId: user.id,
      action: AuditableAction.AUTH_REFRESH,
      entityType: 'RefreshToken',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: accessTtl,
      tokenType: 'Bearer',
    };
  }
}
