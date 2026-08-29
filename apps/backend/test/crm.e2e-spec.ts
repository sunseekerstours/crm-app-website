import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CRM Core (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const adminEmail = `crm_admin_${Date.now()}@sunseekers.test`;
  const adminPassword = 'CrmE2ePassword123!';
  const createdIds: string[] = [];

  function path(p: string) {
    return `/api/v1${p}`;
  }

  function agent() {
    return request(app.getHttpServer());
  }

  function auth(r: request.Test) {
    return r.set('Authorization', `Bearer ${token}`);
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
      .$transaction([prisma.timelineEvent.deleteMany({ where: { entityId: { in: createdIds } } })])
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await app.close();
  });

  it('creates a customer and lists/searches it (CUSTOMER_*)', async () => {
    const email = `cust_${Date.now()}@sunseekers.test`;
    const createRes = await auth(agent().post(path('/customers')))
      .send({ firstName: 'Ama', lastName: 'Mensah', email, phone: '+233200000001', tags: ['vip'] })
      .expect(201);
    const customerId = createRes.body.data.id;
    createdIds.push(customerId);

    const listRes = await auth(agent().get(path('/customers'))).expect(200);
    expect(listRes.body.data.items.length).toBeGreaterThan(0);

    const searchRes = await auth(
      agent().get(path(`/customers?search=${encodeURIComponent('Ama')}`)),
    ).expect(200);
    expect(searchRes.body.data.total).toBeGreaterThan(0);

    const getRes = await auth(agent().get(path(`/customers/${customerId}`))).expect(200);
    expect(getRes.body.data.email).toBe(email);
  });

  it('creates a company with a contact (COMPANY_*/CONTACT_*)', async () => {
    const createRes = await auth(agent().post(path('/companies')))
      .send({
        name: 'Accra Tours Ltd',
        email: 'info@accratours.test',
        contacts: [{ firstName: 'Kofi', lastName: 'Asante', email: 'kofi@accratours.test' }],
      })
      .expect(201);
    const companyId = createRes.body.data.id;
    createdIds.push(companyId);

    await auth(agent().post(path(`/companies/${companyId}/contacts`)))
      .send({ firstName: 'Nana', lastName: 'Osei', email: 'nana@accratours.test' })
      .expect(201);

    const detail = await auth(agent().get(path(`/companies/${companyId}`))).expect(200);
    expect(detail.body.data.contacts.length).toBeGreaterThanOrEqual(2);
  });

  it('creates a lead and converts it to a customer (LEAD_*)', async () => {
    const email = `lead_${Date.now()}@sunseekers.test`;
    const leadRes = await auth(agent().post(path('/leads')))
      .send({ firstName: 'Yaw', lastName: 'Boateng', email, source: 'FACEBOOK', stage: 'NEW' })
      .expect(201);
    const leadId = leadRes.body.data.id;
    createdIds.push(leadId);

    const listRes = await auth(agent().get(path('/leads?stage=NEW&source=FACEBOOK'))).expect(200);
    expect(listRes.body.data.total).toBeGreaterThan(0);

    const convertRes = await auth(agent().post(path(`/leads/${leadId}/convert`))).expect(201);
    expect(convertRes.body.data.customerId).toBeDefined();
    createdIds.push(convertRes.body.data.customerId);

    const leadDetail = await auth(agent().get(path(`/leads/${leadId}`))).expect(200);
    expect(leadDetail.body.data.customerId).toBe(convertRes.body.data.customerId);
  });

  it('creates a deal, checks pipeline, and moves stage (DEAL_*)', async () => {
    const dealRes = await auth(agent().post(path('/deals')))
      .send({ name: 'Coastal Tour Package', value: 4500, currency: 'GHS', stage: 'PROPOSAL' })
      .expect(201);
    const dealId = dealRes.body.data.id;
    createdIds.push(dealId);

    const pipeline = await auth(agent().get(path('/deals/pipeline'))).expect(200);
    const proposals = pipeline.body.data.filter((p: { stage: string }) => p.stage === 'PROPOSAL');
    expect(proposals[0].count).toBeGreaterThan(0);

    const moveRes = await auth(agent().patch(path(`/deals/${dealId}`)))
      .send({ stage: 'NEGOTIATION' })
      .expect(200);
    expect(moveRes.body.data.stage).toBe('NEGOTIATION');
  });

  it('logs activities, tasks and notes on a customer and reads the timeline', async () => {
    const customerRes = await auth(agent().post(path('/customers')))
      .send({ firstName: 'Esi', lastName: 'Owusu' })
      .expect(201);
    const customerId = customerRes.body.data.id;
    createdIds.push(customerId);

    const actRes = await auth(agent().post(path(`/customers/${customerId}/activities`)))
      .send({ type: 'CALL', subject: 'Intro call', description: 'Discussed safari options' })
      .expect(201);
    expect(actRes.body.data.type).toBe('CALL');

    await auth(agent().post(path('/tasks')))
      .send({ title: 'Send follow-up quote', status: 'PENDING', priority: 'HIGH' })
      .expect(201);

    const myDay = await auth(agent().get(path('/tasks/my-day'))).expect(200);
    expect(Array.isArray(myDay.body.data.items)).toBe(true);

    const noteRes = await auth(agent().post(path(`/customers/${customerId}/notes`)))
      .send({ content: 'Prefers beach resorts.' })
      .expect(201);
    expect(noteRes.body.data.content).toBe('Prefers beach resorts.');

    const timeline = await auth(agent().get(path(`/timeline/CUSTOMER/${customerId}`))).expect(200);
    const types = timeline.body.data.items.map((e: { type: string }) => e.type);
    expect(types).toContain('customer.created');
    expect(types).toContain('activity.call');
    expect(types).toContain('note.created');
  });

  it('global search finds a customer (SEARCH)', async () => {
    await auth(agent().post(path('/customers')))
      .send({ firstName: 'Zuri', lastName: 'Smoke' })
      .expect(201);

    const res = await auth(agent().get(path(`/search?q=${encodeURIComponent('Zuri')}`))).expect(
      200,
    );
    expect(res.body.data.customers.length).toBeGreaterThan(0);
  });
});
