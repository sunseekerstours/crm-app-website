import type { Metadata } from 'next';
import TourCard from '@/components/TourCard';
import { apiGet, PublicApiError, TourPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'All Tours | Sunseekers Travel',
  description: 'Browse all tours by Sunseekers Travel.',
};

export default async function ToursPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  let tours: TourPublic[] = [];
  let error = false;

  try {
    tours = await apiGet<TourPublic[]>('/public/tours');
  } catch (e) {
    error = true;
    if (e instanceof PublicApiError) {
      // keep empty list, render friendly message
    }
  }

  const q = (searchParams.q || '').trim().toLowerCase();
  const filtered = q
    ? tours.filter((t) => {
        const hay = (
          t.name +
          ' ' +
          t.summary +
          ' ' +
          (t.destinations ?? []).map((d) => d.destination.name).join(' ')
        ).toLowerCase();
        return hay.includes(q);
      })
    : tours;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Our Collection</div>
          <h2>All Tours</h2>
          <p>
            {error
              ? 'We couldn’t reach the tour catalogue right now. Please try again shortly.'
              : `${filtered.length} tour${filtered.length === 1 ? '' : 's'} available${q ? ` matching “${q}”` : ''}.`}
          </p>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-3">
            {filtered.map((t) => (
              <TourCard key={t.id} tour={t} />
            ))}
          </div>
        ) : (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ margin: 0 }}>
              {error
                ? 'The tour catalogue is temporarily unavailable.'
                : 'No tours match your search.'}{' '}
              <a href="/tours" className="link-arrow">
                View all tours
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
