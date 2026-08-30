import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, TourStatus, PageStatus, DepartureStatus } from '@prisma/client';

/**
 * Wordpress -> Platform migration importer.
 *
 * Reads the captured WP REST API snapshot (docs/wordpress-capture/wordpress-capture.json)
 * and idempotently imports:
 *   - destinations  (from tax_destination)
 *   - published pages (from pages)
 *   - tours + tour days + departures (from trips, itineraries, available_times)
 *
 * The live WordPress site (sunseekerstours.com) is NOT touched - this is a
 * one-way migration from the captured snapshot (PRD golden rule 13).
 */

const prisma = new PrismaClient();

const DEPLOYED_CAPTURE = path.resolve(__dirname, 'wordpress-capture.json');
const REPO_CAPTURE = path.resolve(__dirname, '../../../docs/wordpress-capture/wordpress-capture.json');

const CAPTURE_PATH = fs.existsSync(DEPLOYED_CAPTURE) ? DEPLOYED_CAPTURE : REPO_CAPTURE;

interface WpTerm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: { sizes?: Record<string, { source_url?: string }> };
}

interface WpItinerary {
  title?: string;
  content?: string;
}

interface WpAvailableTime {
  type?: string;
  items?: string[];
}

interface WpTrip {
  slug: string;
  status: string;
  title: { rendered: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  description?: string;
  duration?: { days?: number };
  price?: string;
  sale_price?: string;
  currency?: { code?: string };
  min_pax?: number;
  max_pax?: number;
  code?: string;
  destination?: number[];
  cost_includes?: string;
  cost_excludes?: string;
  is_featured?: boolean;
  itineraries?: WpItinerary[];
  available_times?: WpAvailableTime[];
  featured_image?: { sizes?: Record<string, { source_url?: string }> };
}

interface WpPage {
  slug: string;
  status: string;
  title: { rendered: string };
  content?: { rendered?: string };
  excerpt?: { rendered?: string };
}

interface Capture {
  tax_destination?: WpTerm[];
  pages?: WpPage[];
  trips?: WpTrip[];
}

function jsonValue(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(s?: string): string {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"');
}

function splitLines(s?: string): string[] {
  if (!s) return [];
  return s
    .split(/\r?\n/)
    .map((x) => x.replace(/^[-*\u2022\s]+/, '').trim())
    .filter(Boolean);
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[^\d.]/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return toNumber(v);
}

function fullImageUrl(img: { sizes?: Record<string, { source_url?: string }> } | undefined): string | undefined {
  return img?.sizes?.full?.source_url;
}

function futureDepartureDates(items?: string[]): Date[] {
  if (!items) return [];
  const now = new Date();
  const out: Date[] = [];
  for (const it of items) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(it?.trim() ?? '');
    if (!m) continue;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(d.getTime())) continue;
    if (d > now) out.push(d);
  }
  return out;
}

async function main(): Promise<void> {
  if (!fs.existsSync(CAPTURE_PATH)) {
    console.error(`Capture file not found: ${CAPTURE_PATH}`);
    console.error('Run capture.ps1 first or commit docs/wordpress-capture/wordpress-capture.json');
    process.exit(1);
  }

  const raw = fs.readFileSync(CAPTURE_PATH, 'utf8').replace(/^\uFEFF/, '');
  const capture: Capture = JSON.parse(raw);

  const destIdMap = new Map<number, string>();
  let destCount = 0;
  for (const term of capture.tax_destination ?? []) {
    const exists = await prisma.destination.findUnique({ where: { slug: term.slug } });
    const data = {
      name: term.name,
      slug: term.slug,
      summary: stripHtml(term.description) ?? null,
      coverImage: fullImageUrl(term.thumbnail),
      isActive: true,
    };
    const row = exists
      ? await prisma.destination.update({ where: { slug: term.slug }, data })
      : await prisma.destination.create({ data });
    destIdMap.set(term.id, row.id);
    destCount++;
  }
  console.log(`Destinations: ${destCount}`);

  let pageCount = 0;
  for (const p of capture.pages ?? []) {
    if (p.status !== 'publish') continue;
    const html = p.content?.rendered ?? '';
    const exists = await prisma.page.findUnique({ where: { slug: p.slug } });
    const data = {
      title: decodeEntities(p.title.rendered),
      slug: p.slug,
      excerpt: stripHtml(p.excerpt?.rendered) ?? null,
      body: html ? { html } : {},
      metaTitle: decodeEntities(p.title.rendered),
      metaDescription: stripHtml(p.excerpt?.rendered) ?? null,
      status: PageStatus.PUBLISHED,
      publishedAt: new Date(),
    };
    if (exists) {
      await prisma.page.update({ where: { slug: p.slug }, data });
    } else {
      await prisma.page.create({ data });
    }
    pageCount++;
  }
  console.log(`Published pages: ${pageCount}`);

  let tourCount = 0;
  let departureCount = 0;
  for (const t of capture.trips ?? []) {
    if (t.status !== 'publish') continue;

    const durationDays = t.duration?.days ?? 0;
    const priceNum = toNumber(t.price && t.price !== '' ? t.price : t.sale_price);
    const currency = t.currency?.code ?? 'USD';
    const summary = stripHtml(t.excerpt?.rendered) ?? stripHtml(t.description)?.slice(0, 300) ?? null;
    const description = stripHtml(t.content?.rendered) ?? stripHtml(t.description) ?? null;

    const exists = await prisma.tour.findUnique({ where: { slug: t.slug } });
    const data = {
      name: decodeEntities(t.title.rendered),
      slug: t.slug,
      summary,
      description,
      durationDays,
      minPax: toNullableNumber(t.min_pax) ?? 1,
      maxPax: toNullableNumber(t.max_pax),
      inclusions: splitLines(t.cost_includes),
      exclusions: splitLines(t.cost_excludes),
      highlights: splitLines(t.cost_includes).slice(0, 6),
      coverImage: fullImageUrl(t.featured_image),
      currency,
      basePrice: priceNum,
      status: TourStatus.ACTIVE,
    };
    let row;
    if (exists) {
      row = await prisma.tour.update({ where: { slug: t.slug }, data });
    } else {
      row = await prisma.tour.create({ data });
    }

    const destLinks: { tourId: string; destinationId: string }[] = [];
    for (const id of t.destination ?? []) {
      const dId = destIdMap.get(id);
      if (dId) destLinks.push({ tourId: row.id, destinationId: dId });
    }
    if (destLinks.length) {
      await prisma.tourDestination.deleteMany({ where: { tourId: row.id } });
      await prisma.tourDestination.createMany({ data: destLinks, skipDuplicates: true });
    }

    const itineraries = t.itineraries ?? [];
    if (itineraries.length) {
      await prisma.tourDay.deleteMany({ where: { tourId: row.id } });
      await prisma.tourDay.createMany({
        data: itineraries.map((it, idx) => ({
          tourId: row.id,
          dayNumber: idx + 1,
          title: it.title ?? null,
          description: stripHtml(it.content) ?? null,
          meals: [],
        })),
      });
    }

    const dates = futureDepartureDates(t.available_times?.[0]?.items);
    for (const start of dates) {
      const end = new Date(start.getTime() + Math.max(durationDays, 1) * 24 * 60 * 60 * 1000);
      const existing = await prisma.departure.findFirst({ where: { tourId: row.id, startDate: start } });
      if (!existing) {
        await prisma.departure.create({
          data: {
            tourId: row.id,
            startDate: start,
            endDate: end,
            status: DepartureStatus.SCHEDULED,
            minPax: toNullableNumber(t.min_pax) ?? 1,
            maxPax: toNullableNumber(t.max_pax),
            price: priceNum,
            currency,
          },
        });
        departureCount++;
      }
    }

    tourCount++;
  }
  console.log(`Tours: ${tourCount} | Future departures created: ${departureCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
