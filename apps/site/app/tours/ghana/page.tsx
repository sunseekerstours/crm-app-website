import type { Metadata } from 'next';
import TourCard from '@/components/TourCard';
import { apiGet, TourPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Ghana Tours | Sunseekers Travel',
  description: 'Explore tours across Ghana — history, culture, coastlines and more.',
};

export default async function GhanaToursPage() {
  let tours: TourPublic[] = [];
  let error = false;
  try {
    tours = await apiGet<TourPublic[]>('/public/tours');
  } catch {
    error = true;
  }

  const ghana = tours.filter((t) =>
    (t.destinations ?? []).some((d) => d.destination.country === 'Ghana'),
  );

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Within Ghana</div>
          <h2>Ghana Tours</h2>
          <p>
            {error
              ? 'We couldn’t reach the tour catalogue right now. Please try again shortly.'
              : `${ghana.length} Ghana tour${ghana.length === 1 ? '' : 's'} available.`}
          </p>
        </div>

        {ghana.length > 0 ? (
          <div className="grid grid-3">
            {ghana.map((t) => (
              <TourCard key={t.id} tour={t} />
            ))}
          </div>
        ) : (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ margin: 0 }}>
              {error
                ? 'The tour catalogue is temporarily unavailable.'
                : 'No Ghana tours published yet — check back soon or contact us to plan a trip.'}{' '}
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
