import Link from 'next/link';
import TourCard from '@/components/TourCard';
import { apiGet, DestinationPublic, TourPublic } from '@/lib/api';

export const revalidate = 60;

export default async function HomePage() {
  let tours: TourPublic[] = [];
  let destinations: DestinationPublic[] = [];
  let heroCopy = 'Discover the world, your way.';
  let tourCount = 0;

  try {
    tours = await apiGet<TourPublic[]>('/public/tours');
    tourCount = tours.length;
    heroCopy = `Explore ${tourCount} handcrafted tour${tourCount === 1 ? '' : 's'} across the globe.`;
  } catch {
    heroCopy = 'Handcrafted journeys, small groups, unforgettable memories.';
  }

  try {
    destinations = await apiGet<DestinationPublic[]>('/public/destinations');
  } catch {
    destinations = [];
  }

  const featured = tours.slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{tourCount > 0 ? `${tourCount} incredible journeys.` : 'The world awaits.'}</h1>
          <p>
            {heroCopy} From sun-drenched coastlines to snow-capped peaks,
            every itinerary is crafted by locals and led by expert guides.
          </p>
          <div className="hero-actions">
            <Link href="/tours" className="btn btn-primary">
              Browse Tours
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Plan a Custom Trip
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Featured</div>
            <h2>{tourCount > 0 ? 'Popular tours' : 'Curated tours'}</h2>
            <p>
              {tourCount > 0
                ? `${tourCount} tour${tourCount === 1 ? '' : 's'} ready to book now.`
                : 'Tours are loading — check back shortly to see this season’s departures.'}
            </p>
          </div>

          {tours.length > 0 ? (
            <div className="grid grid-3">
              {featured.map((t) => (
                <TourCard key={t.id} tour={t} />
              ))}
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <p style={{ margin: 0 }}>
                We’re updating our tour catalogue. Please check back soon, or
                contact us to plan your journey.
              </p>
            </div>
          )}
        </div>
      </section>

      {destinations.length > 0 ? (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">Where to</div>
              <h2>Destinations</h2>
              <p>Inspiring places we explore, hand-picked for curious travellers.</p>
            </div>
            <div className="grid grid-4">
              {destinations.slice(0, 8).map((d) => (
                <Link key={d.id} href="/destinations" className="card">
                  <div className="thumb">&#127757;</div>
                  <div className="card-body">
                    <h3 style={{ marginBottom: 4 }}>{d.name}</h3>
                    <div className="meta">
                      <span>{d.country}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-head" style={{ marginBottom: 20 }}>
            <div className="eyebrow">Ready when you are</div>
            <h2>Plan your perfect escape</h2>
            <p>
              Tell us what you love and our travel designers will craft a trip
              made just for you.
            </p>
          </div>
          <Link href="/contact" className="btn btn-primary">
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}
