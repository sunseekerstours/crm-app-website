import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Automation & Notifications Task 9 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let adminUserId: string;

  const adminEmail = 'auto_admin_' + Date.now() + '@sunseekers.test';
  const adminPassword = 'AutoE2ePassword123!';
  const stamp = Date.now();
  const unique = (name: string) => name + ' ' + stamp;

  const createdIds: string[] = [];
  const invoiceIds: string[] = [];

  function path(p: string) {
    return '/api/v1' + p;
  }
  function agent() {
    return request(app.getHttpServer());
  }
  function auth(r: request.Test) {
    return r.set('Authorization', 'Bearer ' + token);
  }

  const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString();

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
        prisma.notificationPreference.deleteMany({ where: { userId: adminUserId } }),
        prisma.notification.deleteMany({ where: { userId: adminUserId } }),
        prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } }),
        prisma.bookingTraveler.deleteMany({ where: { bookingId: { in: createdIds } } }),
        prisma.booking.deleteMany({ where: { customerId: { in: createdIds } } }),
        prisma.departure.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.tour.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.customer.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.user.deleteMany({ where: { email: adminEmail } }),
      ])
      .catch(() => undefined);
    await app.close();
  });

  it('returns 0 unread notifications initially (NOTIFICATION_VIEW)', async () => {
    const res = await auth(agent().get(path('/notifications/unread-count'))).expect(200);
    expect(res.body.data).toBe(0);
  });

  it('turns preferences on/off for a type (NOTIFICATION_MANAGE)', async () => {
    const prefs = await auth(agent().get(path('/notifications/preferences'))).expect(200);
    expect(prefs.body.data.DEPARTURE_REMINDER).toBeDefined();

    const updated = await auth(agent().patch(path('/notifications/preferences'))).send({
      type: 'PAYMENT_REMINDER',
      push: true,
      email: false,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.PAYMENT_REMINDER.push).toBe(true);
    expect(updated.body.data.PAYMENT_REMINDER.email).toBe(false);
  });

  it('creates an upcoming departure and an overdue invoice', async () => {
    const customer = await auth(agent().post(path('/customers')))
      .send({
        firstName: 'Efua',
        lastName: 'Mensimah',
        email: 'efua' + stamp + '@sunseekers.test',
      })
      .expect(201);
    const customerId = customer.body.data.id;
    createdIds.push(customerId);

    const tour = await auth(agent().post(path('/tours')))
      .send({ name: unique('Coastal Discovery'), durationDays: 4, maxPax: 12 })
      .expect(201);
    const tourId = tour.body.data.id;
    createdIds.push(tourId);

    const dep = await auth(agent().post(path('/departures')))
      .send({
        tourId: tourId,
        startDate: daysFromNow(2),
        endDate: daysFromNow(6),
        maxPax: 12,
        price: 4800,
      })
      .expect(201);
    createdIds.push(dep.body.data.id);

    const inv = await auth(agent().post(path('/invoices')))
      .send({ customerId, amount: 1500, currency: 'GHS' })
      .expect(201);
    invoiceIds.push(inv.body.data.id);

    const issued = await auth(agent().patch(path('/invoices/' + inv.body.data.id))).send({
      status: 'ISSUED',
      dueDate: daysFromNow(-3),
    });
    expect(issued.status).toBe(200);
    expect(issued.body.data.dueDate).toBeTruthy();
  });

  it('runs the reminder engine and generates notifications (AUTOMATION_RUN)', async () => {
    const res = await auth(agent().post(path('/automation/reminders/run'))).expect(201);
    expect(res.body.data.departureReminders).toBeGreaterThanOrEqual(1);
    expect(res.body.data.invoiceOverdue).toBeGreaterThanOrEqual(1);
  });

  it('lists generated notifications and exposes unread count', async () => {
    const unread = await auth(agent().get(path('/notifications/unread-count'))).expect(200);
    expect(unread.body.data).toBeGreaterThanOrEqual(2);

    const list = await auth(agent().get(path('/notifications?limit=50'))).expect(200);
    const types = list.body.data.items.map((n: { type: string }) => n.type);
    expect(types).toContain('DEPARTURE_REMINDER');
    expect(types).toContain('INVOICE_OVERDUE');
  });

  it('marks a notification read and then marks all read', async () => {
    const list = await auth(agent().get(path('/notifications?limit=50'))).expect(200);
    const first = list.body.data.items[0];
    expect(first.readAt).toBeNull();

    const read = await auth(agent().patch(path('/notifications/' + first.id + '/read'))).expect(200);
    expect(read.body.data.readAt).toBeTruthy();

    const all = await auth(agent().post(path('/notifications/read-all'))).expect(201);
    expect(all.body.data.updated).toBeGreaterThanOrEqual(1);

    const unread = await auth(agent().get(path('/notifications/unread-count'))).expect(200);
    expect(unread.body.data).toBe(0);
  });
});
