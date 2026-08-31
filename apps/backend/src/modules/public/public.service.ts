import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { ApiNotFoundException, ErrorCode } from '@app/common/errors';
import { DepartureStatus, TourStatus, PageStatus } from '@prisma/client';

const ACTIVE_TOUR_STATUSES: TourStatus[] = [TourStatus.ACTIVE];

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async listTours() {
    const now = new Date();

    const tours = await this.prisma.tour.findMany({
      where: {
        status: { in: ACTIVE_TOUR_STATUSES },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        summary: true,
        description: true,
        durationDays: true,
        type: true,
        difficulty: true,
        minPax: true,
        maxPax: true,
        highlights: true,
        coverImage: true,
        currency: true,
        basePrice: true,
        destinations: {
          select: { destination: { select: { id: true, name: true, slug: true, country: true } } },
        },
      },
    });

    const tourIds = tours.map((t) => t.id);
    const departures = await this.prisma.departure.findMany({
      where: {
        tourId: { in: tourIds },
        status: { not: DepartureStatus.CANCELLED },
        startDate: { gte: now },
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        tourId: true,
        startDate: true,
        endDate: true,
        price: true,
        currency: true,
        bookedCount: true,
        maxPax: true,
      },
    });

    const byTour = new Map<string, Array<Record<string, unknown>>>();
    for (const d of departures) {
      if (!byTour.has(d.tourId)) byTour.set(d.tourId, []);
      byTour.get(d.tourId)!.push({
        ...d,
        price: d.price != null ? Number(d.price) : null,
        remaining: d.maxPax != null ? Math.max(d.maxPax - d.bookedCount, 0) : null,
      });
    }

    return tours.map((tour) => ({
      ...tour,
      basePrice: tour.basePrice != null ? Number(tour.basePrice) : null,
      futureDepartures: byTour.get(tour.id) ?? [],
    }));
  }

  async getTourBySlug(slug: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      include: {
        destinations: { include: { destination: true } },
        days: { orderBy: { dayNumber: 'asc' }, include: { destination: true } },
        departures: {
          where: { status: { not: DepartureStatus.CANCELLED } },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!tour || tour.status !== TourStatus.ACTIVE) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Tour not found');
    }

    const now = new Date();
    const departures = tour.departures.map((d) => ({
      id: d.id,
      startDate: d.startDate,
      endDate: d.endDate,
      price: d.price != null ? Number(d.price) : null,
      currency: d.currency,
      bookedCount: d.bookedCount,
      maxPax: d.maxPax,
      remaining: d.maxPax != null ? Math.max(d.maxPax - d.bookedCount, 0) : null,
      available: d.startDate >= now,
    }));

    const { departures: _ignored, ...rest } = tour;
    return {
      ...rest,
      basePrice: rest.basePrice != null ? Number(rest.basePrice) : null,
      departures,
    };
  }

  async listDestinations() {
    const destinations = await this.prisma.destination.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        slug: true,
        summary: true,
        coverImage: true,
        _count: {
          select: {
            tours: {
              where: { tour: { status: { in: ACTIVE_TOUR_STATUSES } } },
            },
          },
        },
      },
    });
    return destinations;
  }

  async listPublicPages() {
    return this.prisma.page.findMany({
      where: { status: PageStatus.PUBLISHED },
      orderBy: { publishedAt: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        body: true,
        metaTitle: true,
        metaDescription: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  async getPublicPageBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        body: true,
        metaTitle: true,
        metaDescription: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    if (!page || page.status !== PageStatus.PUBLISHED) {
      throw new ApiNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, 'Page not found');
    }
    return page;
  }

  async listPublicSettings() {
    const settings = await this.prisma.siteSetting.findMany({
      where: { isPublic: true },
      select: { key: true, value: true, valueJson: true },
    });
    return settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.valueJson !== null && s.valueJson !== undefined ? s.valueJson : s.value;
      return acc;
    }, {});
  }

  async listProducts(category?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        price: true,
        currency: true,
      },
    });
    return products.map((p) => ({
      ...p,
      price: p.price != null ? Number(p.price) : null,
    }));
  }
}
