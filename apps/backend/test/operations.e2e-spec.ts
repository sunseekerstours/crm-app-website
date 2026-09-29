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

  const supplierIds: string[] = [];
  const hotelIds: string[] = [];
  const vehicleIds: string[] = [];
  const guideIds: string[] = [];
  const driverIds: string[] = [];
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

  it('manages standalone checklist items, including completion (CHECKLIST_*)', async () => {
    const item1 = await auth(agent().post(path('/checklists')))
      .send({ title: unique('Confirm park permits'), category: 'DOCUMENTS' })
      .expect(201);
    const id1 = item1.body.data.id;
    checklistIds.push(id1);
    expect(item1.body.data.isCompleted).toBe(false);

    const item2 = await auth(agent().post(path('/checklists')))
      .send({ title: unique('Vehicle inspection'), isRequired: true })
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

    const list = await auth(agent().get(path('/checklists?limit=50'))).expect(200);
    expect(list.body.data.items).toHaveLength(2);
  });
});
