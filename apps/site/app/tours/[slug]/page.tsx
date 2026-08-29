import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  apiGet,
  DetailDeparturePublic,
  formatDate,
  formatPrice,
  priceOf,
  PublicApiError,
  TourPublic,
} from '@/lib/api';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  let slugs: { slug: string }[] = [];
  try {
    const tours = await apiGet<TourPublic[]>('/public/tours');
    slugs = tours.map((t) => ({ slug: t.slug }));
  } catch {
    slugs = [];
  }
  return slugs;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const tour = await apiGet<TourPublic>(`/public/tours/${params.slug}`);
    return {
      title: `${tour.name} | Sunseekers Travel`,
      description: tour.summary,
    };
  } catch {
    return { title: 'Tour | Sunseekers Travel' };
  }
}

function StatusBadge({ status }: { status: string }) {
  const closed = status === 'CANCELLED' || status === 'FULL';
  return (
    <span className="chip" style={closed ? { background: '#fee2e2', color: '#991b1b' } : undefined}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default async function TourDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  let tour: TourPublic;
  try {
    tour = await apiGet<TourPublic>(`/public/tours/${params.slug}`);
  } catch (e) {
    if (e instanceof PublicApiError && e.status === 404) {
      notFound();
    }
    notFound();
  }

  const places = (tour.destinations ?? []).map((d) => d.destination.name);
  const upcoming = (tour.departures ?? [])
    .filter((d: DetailDeparturePublic) => (d.available ?? false))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);

  return (
    <>
      <div className="detail-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/" style={{ opacity: 0.85 }}>
              Home
            </Link>{' '}
            / <Link href="/tours" style={{ opacity: 0.85 }}>Tours</Link> / {tour.name}
          </div>
          <h1>{tour.name}</h1>
          {places.length ? (
            <p style={{ opacity: 0.9, margin: '0 0 16px' }}>
              {places.join(' · ')}
            </p>
          ) : null}
          <p style={{ maxWidth: '60ch', margin: 0 }}>{tour.summary}</p>
        </div>
      </div>

      <div className="container">
        <div className="detail-grid">
          <div className="flow">
            <div className="kpi-row">
              <div className="kpi">
                <div className="label">Duration</div>
                <div className="value">{tour.durationDays} days</div>
              </div>
              <div className="kpi">
                <div className="label">Difficulty</div>
                <div className="value">{tour.difficulty}</div>
              </div>
              <div className="kpi">
                <div className="label">Group size</div>
                <div className="value">
                  {tour.minPax}{tour.maxPax != null ? `–${tour.maxPax}` : '+'}
                </div>
              </div>
              <div className="kpi">
                <div className="label">From</div>
                <div className="value">
                  {priceOf(tour) ? formatPrice(priceOf(tour)!) : 'Enquire'}
                </div>
              </div>
            </div>

            {tour.description ? (
              <>
                <h2 style={{ fontSize: '1.4rem' }}>About this tour</h2>
                <div
                  style={{ whiteSpace: 'pre-line', color: 'var(--fg)' }}
                >
                  {tour.description}
                </div>
              </>
            ) : null}

            {tour.highlights && tour.highlights.length > 0 ? (
              <>
                <h2 style={{ fontSize: '1.4rem', marginTop: 32 }}>
                  Highlights
                </h2>
                <ul className="highlights">
                  {tour.highlights.map((h, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      {h}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div>
            <div className="panel" style={{ marginBottom: 24 }}>
              <h3 style={{ marginTop: 0 }}>Upcoming departures</h3>
              {upcoming.length > 0 ? (
                upcoming.map((d) => (
                  <div className="departure-row" key={d.id}>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {formatDate(d.startDate)} – {formatDate(d.endDate)}
                      </div>
                      <div className="meta">
                        {typeof d.remaining === 'number' ? (
                          <span>{d.remaining > 0 ? `${d.remaining} spots left` : 'Filling fast'}</span>
                        ) : null}
                        {d.price != null ? (
                          <span>{formatPrice({ price: d.price, currency: d.currency })}</span>
                        ) : null}
                      </div>
                    </div>
                    <Link href="/contact" className="chip" style={{ background: 'var(--brand)', color: '#fff' }}>
                      Enquire
                    </Link>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--muted)' }}>
                  No upcoming departures published yet. Contact us to plan a
                  private departure.
                </p>
              )}
            </div>

            <div className="panel">
              <h3 style={{ marginTop: 0 }}>Can&apos;t find your dates?</h3>
              <p style={{ color: 'var(--muted)' }}>
                We can plan private and bespoke departures around your travel
                dates and group.
              </p>
              <Link href="/contact" className="btn btn-ghost" style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}>
                Plan a custom trip
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
