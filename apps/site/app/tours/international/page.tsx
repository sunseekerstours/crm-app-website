import type { Metadata } from 'next';
import TourCard from '@/components/TourCard';
import { apiGet, TourPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'International Tours | Sunseekers Travel',
  description: 'Explore tours across the world — from sun-drenched coastlines to snow-capped peaks.',
};

export default async function InternationalToursPage() {
  let tours: TourPublic[] = [];
  let error = false;
  try {
    tours = await apiGet<TourPublic[]>('/public/tours');
  } catch {
    error = true;
  }

  const international = tours.filter(
    (t) => !(t.destinations ?? []).some((d) => d.destination.country === 'Ghana'),
  );

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Across the world</div>
          <h2>International Tours</h2>
          <p>
            {error
              ? 'We couldn’t reach the tour catalogue right now. Please try again shortly.'
              : `${international.length} international tour${international.length === 1 ? '' : 's'} available.`}
          </p>
        </div>

        {international.length > 0 ? (
          <div className="grid grid-3">
            {international.map((t) => (
              <TourCard key={t.id} tour={t} />
            ))}
          </div>
        ) : (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ margin: 0 }}>
              {error
                ? 'The tour catalogue is temporarily unavailable.'
                : 'No international tours published yet — check back soon or contact us to plan a trip.'}{' '}
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
