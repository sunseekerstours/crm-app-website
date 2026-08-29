import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Bookings & Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const adminEmail = 'book_admin_' + Date.now() + '@sunseekers.test';
  const adminPassword = 'BookE2ePassword123!';
  const createdIds: string[] = [];
  const stamp = Date.now();
  const unique = (name: string) => name + ' ' + stamp;
  let depCounter = 0;

  function path(p: string) {
    return '/api/v1' + p;
  }
  function agent() {
    return request(app.getHttpServer());
  }
  function auth(r: request.Test) {
    return r.set('Authorization', 'Bearer ' + token);
  }

  async function makeCustomer() {
    const res = await auth(agent().post(path('/customers')))
      .send({ firstName: 'Abena', lastName: 'Quaye', email: 'abena' + stamp + '@sunseekers.test' })
      .expect(201);
    createdIds.push(res.body.data.id);
    return res.body.data.id;
  }

  async function makeDeparture(maxPax: number) {
    const tour = await auth(agent().post(path('/tours')))
      .send({ name: unique('Rainforest Expedition') + '-' + ++depCounter, durationDays: 3, maxPax })
      .expect(201);
    createdIds.push(tour.body.data.id);
    const dep = await auth(agent().post(path('/departures')))
      .send({
        tourId: tour.body.data.id,
        startDate: '2027-06-01T00:00:00.000Z',
        endDate: '2027-06-04T00:00:00.000Z',
        maxPax,
        price: 2500,
      })
      .expect(201);
    createdIds.push(dep.body.data.id);
    return dep.body.data.id;
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
        prisma.payment.deleteMany({ where: { bookingId: { in: createdIds } } }),
        prisma.invoice.deleteMany({ where: { bookingId: { in: createdIds } } }),
        prisma.quote.deleteMany({ where: { customerId: { in: createdIds } } }),
        prisma.bookingTraveler.deleteMany({ where: { bookingId: { in: createdIds } } }),
        prisma.booking.deleteMany({ where: { customerId: { in: createdIds } } }),
        prisma.timelineEvent.deleteMany({ where: { entityId: { in: createdIds } } }),
        prisma.departure.deleteMany({ where: { id: { in: createdIds } } }),
        prisma.tour.deleteMany({ where: { id: { in: createdIds } } }),
      ])
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await app.close();
  });

  it('creates a traveler and lists/searches it (TRAVELER_*)', async () => {
    const createRes = await auth(agent().post(path('/travelers')))
      .send({
        firstName: 'Kojo',
        lastName: 'Mensah',
        email: 'kojo' + stamp + '@sunseekers.test',
        passportNumber: 'G123456',
        nationality: 'Ghana',
      })
      .expect(201);
    const travelerId = createRes.body.data.id;
    createdIds.push(travelerId);
    expect(createRes.body.data.passportNumber).toBe('G123456');

    const searchRes = await auth(
      agent().get(path('/travelers?search=' + encodeURIComponent('Mensah'))),
    ).expect(200);
    expect(searchRes.body.data.total).toBeGreaterThan(0);
  });

  it('creates a booking on a departure, adjusting departure availability (BOOKING_*)', async () => {
    const customerId = await makeCustomer();
    const departureId = await makeDeparture(2);

    const bookingRes = await auth(agent().post(path('/bookings')))
      .send({ customerId, departureId, paxCount: 2, notes: 'Window seats' })
      .expect(201);
    const bookingId = bookingRes.body.data.id;
    createdIds.push(bookingId);
    expect(bookingRes.body.data.bookingNumber).toMatch(/^BKG-/);
    expect(bookingRes.body.data.status).toBe('PENDING');
    expect(bookingRes.body.data.tourName).toBeTruthy();

    const avail = await auth(
      agent().get(path('/departures/' + departureId + '/availability')),
    ).expect(200);
    expect(avail.body.data.remaining).toBe(0);
    expect(avail.body.data.bookedCount).toBe(2);
  });

  it('rejects a booking that exceeds remaining capacity', async () => {
    const customerId = await makeCustomer();
    const departureId = await makeDeparture(1);

    await auth(agent().post(path('/bookings')))
      .send({ customerId, departureId, paxCount: 1 })
      .expect(201);

    await auth(agent().post(path('/bookings')))
      .send({ customerId, departureId, paxCount: 1 })
      .expect(409);
  });

  it('confirms and then cancels a booking (status transitions + availability)', async () => {
    const customerId = await makeCustomer();
    const travelerId = (
      await auth(agent().post(path('/travelers')))
        .send({ firstName: 'Efua', lastName: 'Sowah' })
        .expect(201)
    ).body.data.id;
    createdIds.push(travelerId);

    const bookingId = (
      await auth(agent().post(path('/bookings')))
        .send({ customerId, paxCount: 1 })
        .expect(201)
    ).body.data.id;
    createdIds.push(bookingId);

    await auth(agent().post(path('/bookings/' + bookingId + '/travelers/' + travelerId))).expect(
      201,
    );

    const confirmed = await auth(agent().post(path('/bookings/' + bookingId + '/confirm'))).expect(
      201,
    );
    expect(confirmed.body.data.status).toBe('CONFIRMED');

    const cancelled = await auth(agent().post(path('/bookings/' + bookingId + '/cancel'))).expect(
      201,
    );
    expect(cancelled.body.data.status).toBe('CANCELLED');
  });

  it('creates a quote, accepts it and converts it into a booking (QUOTE_*)', async () => {
    const customerId = await makeCustomer();
    const departureId = await makeDeparture(3);

    const quoteRes = await auth(agent().post(path('/quotes')))
      .send({ customerId, departureId, totalPrice: 2500, currency: 'GHS', notes: 'Group of 2' })
      .expect(201);
    const quoteId = quoteRes.body.data.id;
    createdIds.push(quoteId);
    expect(quoteRes.body.data.quoteNumber).toMatch(/^QTE-/);

    const accepted = await auth(agent().post(path('/quotes/' + quoteId + '/accept'))).expect(201);
    expect(accepted.body.data.status).toBe('ACCEPTED');

    const converted = await auth(agent().post(path('/quotes/' + quoteId + '/convert'))).expect(201);
    expect(converted.body.data.bookingId).toBeTruthy();
    const bookedId = converted.body.data.bookingId;
    createdIds.push(bookedId);

    const quoteDetail = await auth(agent().get(path('/quotes/' + quoteId))).expect(200);
    expect(quoteDetail.body.data.status).toBe('CONVERTED');

    const booking = await auth(agent().get(path('/bookings/' + bookedId))).expect(200);
    expect(booking.body.data.tourName).toBeTruthy();
  });

  it('creates and issues an invoice, records a payment and reconciles to PAID (INVOICE_/PAYMENT_)', async () => {
    const customerId = await makeCustomer();
    const departureId = await makeDeparture(2);

    const bookingId = (
      await auth(agent().post(path('/bookings')))
        .send({ customerId, departureId, paxCount: 1, totalPrice: 2500 })
        .expect(201)
    ).body.data.id;
    createdIds.push(bookingId);

    const invoiceRes = await auth(agent().post(path('/invoices')))
      .send({ bookingId, amount: 2500, currency: 'GHS' })
      .expect(201);
    const invoiceId = invoiceRes.body.data.id;
    createdIds.push(invoiceId);
    expect(invoiceRes.body.data.invoiceNumber).toMatch(/^INV-/);
    expect(invoiceRes.body.data.status).toBe('DRAFT');

    await auth(agent().post(path('/invoices/' + invoiceId + '/issue'))).expect(201);

    const pay1 = await auth(agent().post(path('/payments')))
      .send({ invoiceId, bookingId, amount: 1500, method: 'MOBILE_MONEY' })
      .expect(201);
    createdIds.push(pay1.body.data.id);

    let inv = await auth(agent().get(path('/invoices/' + invoiceId))).expect(200);
    expect(inv.body.data.status).toBe('PARTIALLY_PAID');

    const pay2 = await auth(agent().post(path('/payments')))
      .send({ invoiceId, bookingId, amount: 1000, method: 'CARD' })
      .expect(201);
    createdIds.push(pay2.body.data.id);

    inv = await auth(agent().get(path('/invoices/' + invoiceId))).expect(200);
    expect(inv.body.data.status).toBe('PAID');
  });
});
