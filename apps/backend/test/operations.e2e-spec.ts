import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Operations Task 6 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const adminEmail = 'ops_admin_' + Date.now() + '@sunseekers.test';
  const adminPassword = 'OpsE2ePassword123!';
  const stamp = Date.now();
  const unique = (name: string) => name + ' ' + stamp;
  let counter = 0;

  const supplierIds: string[] = [];
  const hotelIds: string[] = [];
  const vehicleIds: string[] = [];
  const guideIds: string[] = [];
  const driverIds: string[] = [];
  const departureIds: string[] = [];
  const tourIds: string[] = [];
  const assignmentIds: string[] = [];
  const checklistIds: string[] = [];

  function path(p: string) {
    return '/api/v1' + p;
  }
  function agent() {
    return request(app.getHttpServer());
  }
  function auth(r: request.Test) {
    return r.set('Authorization', 'Bearer ' + token);
  }

  async function makeDeparture() {
    const tour = await auth(agent().post(path('/tours')))
      .send({ name: unique('Operations Trip') + '-' + ++counter, durationDays: 3, maxPax: 10 })
      .expect(201);
    tourIds.push(tour.body.data.id);
    const dep = await auth(agent().post(path('/departures')))
      .send({
        tourId: tour.body.data.id,
        startDate: '2027-07-01T00:00:00.000Z',
        endDate: '2027-07-04T00:00:00.000Z',
        maxPax: 10,
        price: 3000,
      })
      .expect(201);
    departureIds.push(dep.body.data.id);
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
        prisma.checklistItem.deleteMany({ where: { id: { in: checklistIds } } }),
        prisma.tripAssignment.deleteMany({ where: { id: { in: assignmentIds } } }),
        prisma.departure.deleteMany({ where: { id: { in: departureIds } } }),
        prisma.tour.deleteMany({ where: { id: { in: tourIds } } }),
        prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } }),
        prisma.driver.deleteMany({ where: { id: { in: driverIds } } }),
        prisma.guide.deleteMany({ where: { id: { in: guideIds } } }),
        prisma.hotel.deleteMany({ where: { id: { in: hotelIds } } }),
        prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } }),
      ])
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await app.close();
  });

  it('creates a supplier and a hotel linked to it (SUPPLIER_*/HOTEL_*)', async () => {
    const supplierRes = await auth(agent().post(path('/suppliers')))
      .send({
        name: unique('Allied Hotels Ltd'),
        type: 'HOTEL',
        country: 'Ghana',
        paymentTerms: 'Net 30',
      })
      .expect(201);
    const supplierId = supplierRes.body.data.id;
    supplierIds.push(supplierId);
    expect(supplierRes.body.data.type).toBe('HOTEL');
    expect(supplierRes.body.data.isActive).toBe(true);

    const hotelRes = await auth(agent().post(path('/hotels')))
      .send({ name: unique('Baobab Beach Resort'), supplierId, starRating: 4, country: 'Ghana' })
      .expect(201);
    const hotelId = hotelRes.body.data.id;
    hotelIds.push(hotelId);
    expect(hotelRes.body.data.starRating).toBe(4);

    const detail = await auth(agent().get(path('/hotels/' + hotelId))).expect(200);
    expect(detail.body.data.supplier.name).toBe(supplierRes.body.data.name);
  });

  it('creates a guide, a driver and a vehicle linked to the supplier (GUIDE_/DRIVER_/VEHICLE_*)', async () => {
    const supplierRes = await auth(agent().post(path('/suppliers')))
      .send({ name: unique('Savanna Transport'), type: 'TRANSPORT' })
      .expect(201);
    const supplierId = supplierRes.body.data.id;
    supplierIds.push(supplierId);

    const guideRes = await auth(agent().post(path('/guides')))
      .send({ firstName: 'Kofi', lastName: 'Asante', supplierId, languages: ['English', 'Twi'] })
      .expect(201);
    const guideId = guideRes.body.data.id;
    guideIds.push(guideId);
    expect(guideRes.body.data.specialities).toEqual([]);

    const driverRes = await auth(agent().post(path('/drivers')))
      .send({ firstName: 'Yaw', lastName: 'Boateng', supplierId, licenseNumber: 'LIC-0099' })
      .expect(201);
    const driverId = driverRes.body.data.id;
    driverIds.push(driverId);

    const vehicleRes = await auth(agent().post(path('/vehicles')))
      .send({
        name: unique('Land Cruiser 7'),
        type: 'SUV_4X4',
        capacity: 7,
        ownerSupplierId: supplierId,
        driverId,
      })
      .expect(201);
    vehicleIds.push(vehicleRes.body.data.id);
    expect(vehicleRes.body.data.capacity).toBe(7);

    const search = await auth(
      agent().get(path('/guides?search=' + encodeURIComponent('Asante'))),
    ).expect(200);
    expect(search.body.data.total).toBeGreaterThan(0);
  });

  it('assigns resources to a trip and reads the trip board (TRIP_*)', async () => {
    const supplierRes = await auth(agent().post(path('/suppliers')))
      .send({ name: unique('Rainforest Lodge Co'), type: 'HOTEL' })
      .expect(201);
    const supplierId = supplierRes.body.data.id;
    supplierIds.push(supplierId);

    const hotelRes = await auth(agent().post(path('/hotels')))
      .send({ name: unique('Canopy Lodge'), supplierId })
      .expect(201);
    const hotelId = hotelRes.body.data.id;
    hotelIds.push(hotelId);

    const guideRes = await auth(agent().post(path('/guides')))
      .send({ firstName: 'Ama', lastName: 'Darko' })
      .expect(201);
    const guideId = guideRes.body.data.id;
    guideIds.push(guideId);

    const vehicleRes = await auth(agent().post(path('/vehicles')))
      .send({ name: unique('Safari 4x4'), type: 'SUV_4X4', capacity: 6 })
      .expect(201);
    const vehicleId = vehicleRes.body.data.id;
    vehicleIds.push(vehicleId);

    const departureId = await makeDeparture();

    const assignRes = await auth(agent().post(path('/trips/' + departureId + '/assignments')))
      .send({ dayNumber: 1, guideId, hotelId, vehicleId, notes: 'Day 1 pickup at 8am' })
      .expect(201);
    assignmentIds.push(assignRes.body.data.id);
    expect(assignRes.body.data.dayNumber).toBe(1);

    const board = await auth(agent().get(path('/trips/' + departureId + '/board'))).expect(200);
    expect(board.body.data.resources.guidesAssigned).toBe(1);
    expect(board.body.data.resources.hotelsAssigned).toBe(1);
    expect(board.body.data.resources.vehiclesAssigned).toBe(1);
    expect(board.body.data.assignments).toHaveLength(1);
    expect(board.body.data.departure.availableSeats).toBe(10);
  });

  it('manages checklist items for a trip, including completion (CHECKLIST_*)', async () => {
    const departureId = await makeDeparture();

    const item1 = await auth(agent().post(path('/checklists')))
      .send({ departureId, title: unique('Confirm park permits'), category: 'DOCUMENTS' })
      .expect(201);
    const id1 = item1.body.data.id;
    checklistIds.push(id1);
    expect(item1.body.data.isCompleted).toBe(false);

    const item2 = await auth(agent().post(path('/checklists')))
      .send({ departureId, title: unique('Vehicle inspection'), isRequired: true })
      .expect(201);
    const id2 = item2.body.data.id;
    checklistIds.push(id2);

    const completed = await auth(agent().post(path('/checklists/' + id1 + '/complete'))).expect(
      201,
    );
    expect(completed.body.data.isCompleted).toBe(true);
    expect(completed.body.data.completedAt).toBeTruthy();

    const reopened = await auth(agent().post(path('/checklists/' + id1 + '/reopen'))).expect(201);
    expect(reopened.body.data.isCompleted).toBe(false);

    const board = await auth(agent().get(path('/trips/' + departureId + '/board'))).expect(200);
    expect(board.body.data.checklists.total).toBe(2);
    expect(board.body.data.checklists.completed).toBe(0);
  });
});
