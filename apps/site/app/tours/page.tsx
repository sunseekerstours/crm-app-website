import type { Metadata } from 'next';
import TourCard from '@/components/TourCard';
import PageHeroSlider from '@/components/PageHeroSlider';
import { apiGet, PublicApiError, TourPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'All Tours & Holiday Packages | Sunseekers Tours',
  description: 'Browse our complete catalog of curated Ghana cultural tours and international holiday packages.',
};

const ALL_TOURS_HERO_SLIDES = [
  'https://sunseekerstours.com/wp-content/uploads/2026/08/afrofuture-festival-afrochella-fest_0UTNM.webp',
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1920&auto=format&fit=crop',
  'https://sunseekerstours.com/wp-content/uploads/2026/07/Universal-Studios-Singapore.jpg',
  'https://sunseekerstours.com/wp-content/uploads/2026/07/images.jpg',
];

export default async function ToursPage({
  searchParams,
}: {
  searchParams: { q?: string; destination?: string };
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

  const q = (searchParams.q || searchParams.destination || '').trim().toLowerCase();
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
    <>
      {/* 4-Slide Auto-Transitioning Hero Banner */}
      <PageHeroSlider
        slides={ALL_TOURS_HERO_SLIDES}
        defaultEyebrow="FEATURED EXPEDITIONS"
        defaultTitle="All Tours &amp; Holiday Packages"
        defaultSubtitle="Discover our full collection of cultural celebrations, wildlife safaris &amp; exotic getaways"
        height="390px"
      />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Our Complete Collection</div>
            <h2>Curated Holiday Packages</h2>
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
            <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 24px' }}>
              <p style={{ margin: 0, fontSize: '15px' }}>
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
    </>
  );
}
