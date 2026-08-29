import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { UserStatus } from '@prisma/client';
import { ApiUnauthorizedException } from '@app/common/errors';

const userFixture = {
  id: 'user-1',
  email: 'admin@sunseeker.local',
  passwordHash: 'hashed-password',
  firstName: 'System',
  lastName: 'Admin',
  phone: null,
  status: UserStatus.ACTIVE,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userWithRoles = {
  ...userFixture,
  roles: [
    {
      role: {
        name: 'SUPER_ADMIN',
        permissions: [{ permission: { key: 'users.view' } }],
      },
    },
  ],
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    passwordResetToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-access-token'),
  };
  const config = {
    get: jest.fn((key: string) => {
      const map: Record<string, unknown> = {
        'jwt.accessTtl': 900,
        'jwt.refreshTtl': 604800,
        bcryptSaltRounds: 10,
        passwordResetTtl: 3600,
      };
      return map[key];
    }),
  };
  const audit = { record: jest.fn() };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(userWithRoles),
        update: jest.fn().mockResolvedValue(userFixture),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    };

    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('login succeeds and returns tokens + user payload', async () => {
    const result = await service.login(
      { email: 'ADMIN@SUNSEEKER.LOCAL', password: 'whatever' },
      { ipAddress: '127.0.0.1' },
    );

    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toBeDefined();
    expect(result.user.roles).toEqual(['SUPER_ADMIN']);
    expect(result.user.permissions).toContain('users.view');
    // Refresh token is persisted (hashed)
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.create.mock.calls[0][0].data.tokenHash).toBeTruthy();
    expect(prisma.refreshToken.create.mock.calls[0][0].data.tokenHash).not.toBe(
      result.refreshToken,
    );
  });

  it('login rejects when password is invalid', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
    await expect(
      service.login({ email: 'admin@sunseeker.local', password: 'wrong' }, {}),
    ).rejects.toMatchObject({ message: 'Invalid email or password' });
  });

  it('login rejects when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@sunseeker.local', password: 'x' }, {}),
    ).rejects.toMatchObject({ message: 'Invalid email or password' });
    expect(audit.record).toHaveBeenCalled();
  });

  it('login rejects suspended accounts', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    prisma.user.findUnique.mockResolvedValue({
      ...userWithRoles,
      status: UserStatus.SUSPENDED,
    });
    try {
      await service.login({ email: 'admin@sunseeker.local', password: 'x' }, {});
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiUnauthorizedException);
      expect((err as ApiUnauthorizedException).message).toContain('suspended');
    }
  });

  it('refresh rotates the token and revokes the old one', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
      user: userWithRoles,
    });

    const result = await service.refresh('some-raw-token', {});
    expect(result.accessToken).toBe('signed-access-token');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rt-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('refresh rejects an already-revoked token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: new Date(),
      user: userWithRoles,
    });
    await expect(service.refresh('raw', {})).rejects.toMatchObject({
      message: 'Invalid refresh token',
    });
  });
});
