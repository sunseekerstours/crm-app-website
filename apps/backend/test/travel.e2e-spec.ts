import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Travel Core (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const adminEmail = 'travel_admin_' + Date.now() + '@sunseekers.test';
  const adminPassword = 'TravelE2ePassword123!';
  const createdIds: string[] = [];
  const stamp = Date.now();

  const unique = (name: string) => name + ' ' + stamp;

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
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        status: 'ACTIVE',
        roles: { create: { roleId: role!.id } },
      },
    });

    const login = await request(app.getHttpServer())
      .post(path('/auth/login'))
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    token = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma
      .$transaction([
        prisma.timelineEvent.deleteMany({ where: { entityId: { in: createdIds } } }),
        prisma.tour.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.destination.deleteMany({ where: { id: { in: createdIds } } }),
      ])
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await app.close();
  });

  it('creates and finds a destination (DESTINATION_*)', async () => {
    const createRes = await auth(agent().post(path('/destinations')))
      .send({
        name: unique('Cape Coast'),
        country: 'Ghana',
        region: 'Central',
        summary: 'Coastal fortress town',
      })
      .expect(201);
    const id = createRes.body.data.id;
    createdIds.push(id);
    expect(createRes.body.data.slug).toBe('cape-coast-' + stamp);
    expect(createRes.body.data.isActive).toBe(true);

    const listRes = await auth(
      agent().get(path('/destinations?country=' + encodeURIComponent('Ghana'))),
    ).expect(200);
    expect(listRes.body.data.total).toBeGreaterThan(0);

    const single = await auth(agent().get(path('/destinations/' + id))).expect(200);
    expect(single.body.data.name).toBe(unique('Cape Coast'));
  });

  it('creates a tour with destinations and itinerary days (TOUR_*)', async () => {
    const destA = await auth(agent().post(path('/destinations')))
      .send({ name: unique('Kakum'), country: 'Ghana', region: 'Central' })
      .expect(201);
    const destB = await auth(agent().post(path('/destinations')))
      .send({ name: unique('Elmina'), country: 'Ghana', region: 'Central' })
      .expect(201);
    createdIds.push(destA.body.data.id, destB.body.data.id);

    const createRes = await auth(agent().post(path('/tours')))
      .send({
        name: unique('Central Ghana Discovery'),
        summary: 'Coastal and rainforest highlights',
        durationDays: 4,
        maxPax: 16,
        basePrice: 3200,
        currency: 'GHS',
        destinationIds: [destA.body.data.id, destB.body.data.id],
        days: [
          {
            dayNumber: 1,
            title: 'Arrive Accra',
            meals: ['Dinner'],
            destinationId: destB.body.data.id,
          },
          { dayNumber: 2, title: 'Kakum canopy walk', meals: ['Breakfast', 'Lunch'] },
        ],
      })
      .expect(201);
    const tourId = createRes.body.data.id;
    createdIds.push(tourId);

    expect(createRes.body.data.status).toBe('DRAFT');
    expect(createRes.body.data.destinations.length).toBe(2);
    expect(createRes.body.data.days.length).toBe(2);

    const searchRes = await auth(
      agent().get(path('/tours?search=' + encodeURIComponent('Discovery'))),
    ).expect(200);
    expect(searchRes.body.data.total).toBeGreaterThan(0);

    const detail = await auth(agent().get(path('/tours/' + tourId))).expect(200);
    expect(detail.body.data.days).toHaveLength(2);
  });

  it('publishes a tour and exposes it on the public endpoint (TOUR_PUBLISH)', async () => {
    const createRes = await auth(agent().post(path('/tours')))
      .send({ name: unique('Volta Highlands Trek'), durationDays: 3, maxPax: 12 })
      .expect(201);
    const tourId = createRes.body.data.id;
    createdIds.push(tourId);

    const publishRes = await auth(agent().post(path('/tours/' + tourId + '/publish'))).expect(201);
    expect(publishRes.body.data.status).toBe('ACTIVE');

    const publicList = await agent().get(path('/public/tours')).expect(200);
    const names = publicList.body.data.map((t: { name: string }) => t.name);
    expect(names).toContain(unique('Volta Highlands Trek'));
  });

});
