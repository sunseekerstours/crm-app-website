import Link from 'next/link';
import type { Metadata } from 'next';
import { apiGet, DestinationPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Destinations | Sunseekers Travel',
  description: 'Explore the destinations Sunseekers Travel visits.',
};

export default async function DestinationsPage() {
  let destinations: DestinationPublic[] = [];
  let error = false;

  try {
    destinations = await apiGet<DestinationPublic[]>('/public/destinations');
  } catch {
    error = true;
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Where We Travel</div>
          <h2>Destinations</h2>
          <p>
            {error
              ? 'We couldn’t load destinations right now.'
              : `${destinations.length} hand-picked destination${destinations.length === 1 ? '' : 's'} to inspire your next journey.`}
          </p>
        </div>

        {destinations.length > 0 ? (
          <div className="grid grid-3">
            {destinations.map((d) => (
              <div key={d.id} className="card">
                <div className="thumb">&#127757;</div>
                <div className="card-body">
                  <h3>{d.name}</h3>
                  <div className="meta" style={{ marginBottom: 8 }}>
                    <span>{d.country}</span>
                    {typeof d._count?.tours === 'number' && d._count.tours > 0 ? (
                      <span className="chip">{d._count.tours} tour{d._count.tours === 1 ? '' : 's'}</span>
                    ) : null}
                  </div>
                  {d.summary ? <p>{d.summary}</p> : null}
                  <Link href="/tours" className="link-arrow">
                    See related tours →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ margin: 0 }}>
              {error
                ? 'Destinations are temporarily unavailable.'
                : 'No destinations published yet.'}{' '}
              <Link href="/tours" className="link-arrow">
                Browse tours
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
