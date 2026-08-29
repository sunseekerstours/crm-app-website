import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let roleId: string;

  const adminEmail = `admin_${Date.now()}@sunseekers.test`;
  const adminPassword = 'E2ePassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);
    const role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    roleId = role!.id;

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        status: 'ACTIVE',
        roles: { create: { roleId } },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await app.close();
  });

  function path(p: string) {
    return `/api/v1${p}`;
  }

  it('rejects unauthenticated requests on protected routes', async () => {
    await request(app.getHttpServer()).get(path('/auth/me')).expect(401);
  });

  it('rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post(path('/auth/login'))
      .send({ email: adminEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in, reads profile, refreshes and logs out', async () => {
    const loginRes = await request(app.getHttpServer())
      .post(path('/auth/login'))
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    const { accessToken, refreshToken } = loginRes.body.data;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // /auth/me with token
    const meRes = await request(app.getHttpServer())
      .get(path('/auth/me'))
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body.data.email).toBe(adminEmail);

    // list users requires users.view which SUPER_ADMIN has
    const usersRes = await request(app.getHttpServer())
      .get(path('/users'))
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(usersRes.body.data.items)).toBe(true);

    // refresh token rotation
    const refreshRes = await request(app.getHttpServer())
      .post(path('/auth/refresh'))
      .send({ refreshToken })
      .expect(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    // logout
    await request(app.getHttpServer())
      .post(path('/auth/logout'))
      .send({ refreshToken })
      .expect(200);
  });

  it('requesting a password reset returns success and does not leak user existence', async () => {
    const res = await request(app.getHttpServer())
      .post(path('/auth/password-reset/request'))
      .send({ email: 'does-not-exist@sunseekers.test' })
      .expect(200);
    expect(res.body.data.success).toBe(true);
  });
});
