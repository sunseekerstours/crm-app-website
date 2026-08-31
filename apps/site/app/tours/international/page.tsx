import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'World Adventure | International Tours | Sunseekers Tours',
  description:
    'Discover world adventure tours with Sunseekers Tours. Handcrafted international trips to Singapore, Dubai, Rwanda, Seychelles, and beyond.',
};

export default function InternationalToursPage() {
  const INTERNATIONAL_TOURS = [
    {
      title: 'Incredible Singapore',
      destination: 'Singapore',
      duration: '5 Days',
      slug: 'incredible-singapore',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/images-1-2.jpg',
    },
    {
      title: 'The Ultimate Dubai Experience',
      destination: 'Dubai',
      duration: '5 Days',
      slug: 'the-ultimate-dubai-experience',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/images.jpg',
    },
    {
      title: 'Mahé Island Seychelles',
      destination: 'Mahé Island Seychelles',
      duration: '5 Days',
      slug: 'desert-dream-getaway',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/04/images-3.jpg',
    },
    {
      title: '4/5 - DAY TOUR OF RWANDA',
      destination: 'Rwanda',
      duration: '5 Days',
      slug: 'asambe-south-africa',
      image: 'https://sunseekerstours.com/wp-content/uploads/2025/11/images-1.jpg',
    },
    {
      title: 'Experience Singapore',
      destination: 'Singapore',
      duration: '5 Days',
      slug: 'summer-in-dubai',
      image: 'https://sunseekerstours.com/wp-content/uploads/2025/11/Experience-Singapore-4.webp',
    },
    {
      title: 'Explore Singapore & Malaysia',
      destination: 'Singapore & Malaysia',
      duration: '8 Days',
      slug: 'explore-singapore-malaysia',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Universal-Studios-Singapore.jpg',
    },
  ];

  return (
    <>
      {/* World Adventure Hero Banner (Screenshot 5) */}
      <section className="page-hero-banner">
        <div>
          <h1>World Adventure</h1>
          <p>Find your best tours here</p>
        </div>
      </section>

      {/* Tours Grid */}
      <section className="section">
        <div className="container">
          <div className="grid-3">
            {INTERNATIONAL_TOURS.map((tour) => (
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
