import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Public API + Website Task 11 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;

  const adminEmail = 'pub_admin_' + Date.now() + '@sunseekers.test';
  const adminPassword = 'PubE2ePassword123!';
  const stamp = Date.now();

  const createdIds: string[] = [];

  function path(p: string) {
    return '/api/v1' + p;
  }
  function agent() {
    return request(app.getHttpServer());
  }
  function auth(r: request.Test) {
    return r.set('Authorization', 'Bearer ' + token);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);
    const role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        status: 'ACTIVE',
        roles: { create: { roleId: role!.id } },
      },
    });
    adminUserId = user.id;

    const login = await request(app.getHttpServer())
      .post(path('/auth/login'))
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    token = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma
      .$transaction([
        prisma.departure.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.tour.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.destination.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.user.deleteMany({ where: { email: adminEmail } }),
      ])
      .catch(() => undefined);
    await app.close();
  });

  it('publishes a tour with destination + departure (setup)', async () => {
    const dest = await auth(agent().post(path('/destinations')))
      .send({ name: 'Elephant Coast' + stamp, country: 'Ghana', slug: 'elephant-coast-' + stamp })
      .expect(201);
    const destId = dest.body.data.id;
    createdIds.push(destId);

    const tour = await auth(agent().post(path('/tours')))
      .send({
        name: 'Heritage Trails ' + stamp,
        slug: 'heritage-trails-' + stamp,
        summary: 'A public heritage experience',
        description: 'Full public tour description',
        durationDays: 3,
        maxPax: 10,
        basePrice: 2000,
        currency: 'GHS',
        status: 'ACTIVE',
        destinationIds: [destId],
      })
      .expect(201);
    const tourId = tour.body.data.id;
    createdIds.push(tourId);
    expect(tour.body.data.status).toBe('ACTIVE');
  });

  it('lists published tours without authentication (@Public)', async () => {
    const res = await agent().get(path('/public/tours')).expect(200);
    const names = res.body.data.map((t: { name: string }) => t.name);
    expect(names).toContain('Heritage Trails ' + stamp);
  });

  it('returns a single published tour by slug including pricing + departures', async () => {
    const res = await agent().get(path('/public/tours/heritage-trails-' + stamp)).expect(200);
    expect(res.body.data.name).toBe('Heritage Trails ' + stamp);
    expect(res.body.data.basePrice).toBe(2000);
    expect(Array.isArray(res.body.data.departures)).toBe(true);
  });

  it('404s for a tour that is not ACTIVE or does not exist', async () => {
    await agent().get(path('/public/tours/does-not-exist-' + stamp)).expect(404);
  });

  it('lists active destinations without authentication', async () => {
    const res = await agent().get(path('/public/destinations')).expect(200);
    const names = res.body.data.map((d: { name: string }) => d.name);
    expect(names).toContain('Elephant Coast' + stamp);
  });
});
