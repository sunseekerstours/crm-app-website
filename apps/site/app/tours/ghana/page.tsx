import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeroSlider from '@/components/PageHeroSlider';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Explore Ghana | Tour Ghana | Sunseekers Tours',
  description:
    'Experience rich culture, history, and natural beauty across Ghana with Sunseekers Tours. Curated cultural festivals, historical heritage, and scenic adventures.',
};

const GHANA_HERO_SLIDES = [
  'https://sunseekerstours.com/wp-content/uploads/2025/11/Black-star-square.png',
  'https://sunseekerstours.com/wp-content/uploads/2026/08/Photo-by-Afronation-com-1024x576-1.jpeg',
  'https://sunseekerstours.com/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-27-at-11.14.11-AM.jpeg',
  'https://sunseekerstours.com/wp-content/uploads/2026/08/y17gwk3vvq_independence_day.jpg',
];

export default function GhanaToursPage() {
  const GHANA_TOURS = [
    {
      title: 'December in Ghana 12 Days',
      destination: 'Ghana',
      duration: '12 Days',
      slug: 'december-in-ghana-12-days',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/Photo-by-Afronation-com-1024x576-1.jpeg',
    },
    {
      title: 'December in Ghana 8 Days',
      destination: 'Ghana',
      duration: '8 Days',
      slug: 'december-in-ghana-8-days',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/afrofuture-festival-afrochella-fest_0UTNM.webp',
    },
    {
      title: 'Chalewote Street Festival',
      destination: 'Ghana',
      duration: '7 Days',
      slug: 'chalewote-street-festival-2',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-27-at-11.14.11-AM.jpeg',
    },
    {
      title: 'Ghana @ 70 Anniversary',
      destination: 'Ghana',
      duration: '6 Days',
      slug: 'ghana-70-anniversary-2',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/y17gwk3vvq_independence_day.jpg',
    },
    {
      title: 'Adventure & Trekking',
      destination: 'Ghana',
      duration: '10 Days',
      slug: 'adventure-trekking',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop',
    },
    {
      title: 'Authentic Cultural Experience',
      destination: 'Ghana',
      duration: '14 Days',
      slug: 'ghana-classic',
      image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=800&auto=format&fit=crop',
    },
  ];

  return (
    <>
      {/* 4-Slide Auto-Transitioning Hero Banner */}
      <PageHeroSlider
        slides={GHANA_HERO_SLIDES}
        defaultEyebrow="DISCOVER THE HEART OF WEST AFRICA"
        defaultTitle="Explore Ghana Tours"
        defaultSubtitle="Experience rich culture, castles, ancestral heritage, and vibrant festivals"
        height="390px"
      />

      {/* Ghana Tours Grid */}
      <section className="section">
        <div className="container">
          <div className="grid-3">
            {GHANA_TOURS.map((tour) => (
              <div key={tour.slug} className="tour-card">
                <div className="tour-card-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tour.image}
                    alt={tour.title}
                    loading="lazy"
                  />
                  <div className="tour-card-badge">{tour.destination}</div>
                  <button className="tour-card-heart" title="Save to Favorites" aria-label="Favorite">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                </div>

                <div className="tour-card-body">
                  <div className="tour-card-dest">
                    <span>📍 {tour.destination}</span>
                  </div>
                  <h3 className="tour-card-title">{tour.title}</h3>

                  <div className="tour-card-meta">
                    <div className="tour-card-duration">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{tour.duration}</span>
                    </div>
                    <span className="tour-card-price">Best Value</span>
                  </div>

                  <Link href={`/tours/${tour.slug}`} className="btn-view-details">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
