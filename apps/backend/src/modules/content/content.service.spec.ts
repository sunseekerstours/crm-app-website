import { Test } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { AuditService } from '@app/modules/audit/audit.service';
import { PageStatus } from '@prisma/client';
import { ApiNotFoundException, ApiConflictException } from '@app/common/errors';

const ctx = { userId: 'user-1', ipAddress: '127.0.0.1', userAgent: 'jest', requestId: 'req-1' };

function mockPage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'page-1',
    title: 'About Us',
    slug: 'about-us',
    excerpt: null,
    body: {},
    metaTitle: null,
    metaDescription: null,
    status: PageStatus.PUBLISHED,
    publishedAt: new Date(),
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ContentService', () => {
  let service: ContentService;

  const prisma = {
    page: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    siteSetting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get<ContentService>(ContentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPage', () => {
    it('creates a page with a slugified slug and audits', async () => {
      prisma.page.findUnique.mockResolvedValue(null);
      prisma.page.create.mockResolvedValue(mockPage({ status: PageStatus.DRAFT, publishedAt: null }));

      const result = await service.createPage({ title: 'About Us' }, ctx);

      expect(prisma.page.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'About Us', slug: 'about-us' }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAGE_CREATED' }));
      expect(result.slug).toBe('about-us');
    });

    it('throws conflict when slug already exists', async () => {
      prisma.page.findUnique.mockResolvedValue(mockPage());
      await expect(service.createPage({ title: 'About Us' }, ctx)).rejects.toBeInstanceOf(
        ApiConflictException,
      );
    });
  });

  describe('findPageById', () => {
    it('returns a page when found', async () => {
      prisma.page.findUnique.mockResolvedValue(mockPage());
      const result = await service.findPageById('page-1');
      expect(result.id).toBe('page-1');
    });

    it('throws not found when missing', async () => {
      prisma.page.findUnique.mockResolvedValue(null);
      await expect(service.findPageById('nope')).rejects.toBeInstanceOf(ApiNotFoundException);
    });
  });

  describe('updatePage', () => {
    it('updates a page and audits', async () => {
      prisma.page.findUnique.mockResolvedValue(mockPage());
      prisma.page.update.mockResolvedValue(mockPage({ title: 'Updated' }));

      const result = await service.updatePage('page-1', { title: 'Updated' }, ctx);

      expect(prisma.page.update).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAGE_UPDATED' }));
      expect(result.title).toBe('Updated');
    });
  });

  describe('updateSiteSetting', () => {
    it('creates a new setting when key is missing and audits', async () => {
      prisma.siteSetting.findUnique.mockResolvedValue(null);
      const created = { id: 's-1', key: 'hero_title', value: 'Welcome', valueJson: null };
      prisma.siteSetting.create.mockResolvedValue(created);

      const result = await service.updateSiteSetting('hero_title', { value: 'Welcome' }, ctx);

      expect(prisma.siteSetting.create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SITE_SETTING_UPDATED', entityId: 'hero_title' }),
      );
      expect(result.key).toBe('hero_title');
    });
  });
});
