import Link from 'next/link';

export const revalidate = 60;

export default function HomePage() {
  const TRENDING_TOURS = [
    {
      title: 'December in Ghana 12 Days',
      slug: 'december-in-ghana-12-days',
      destination: 'Ghana',
      duration: '12 Days - 11 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/Photo-by-Afronation-com-1024x576-1.jpeg',
    },
    {
      title: 'December in Ghana 8 Days',
      slug: 'december-in-ghana-8-days',
      destination: 'Ghana',
      duration: '8 Days - 7 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/afrofuture-festival-afrochella-fest_0UTNM.webp',
    },
    {
      title: 'Chalewote Street Festival',
      slug: 'chalewote-street-festival-2',
      destination: 'Ghana',
      duration: '7 Days - 6 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-27-at-11.14.11-AM.jpeg',
    },
    {
      title: 'Ghana @ 70 Anniversary',
      slug: 'ghana-70-anniversary-2',
      destination: 'Ghana',
      duration: '6 Days - 5 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/y17gwk3vvq_independence_day.jpg',
    },
    {
      title: 'Explore Singapore & Malaysia',
      slug: 'explore-singapore-malaysia',
      destination: 'Singapore',
      duration: '8 Days - 7 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Universal-Studios-Singapore.jpg',
    },
    {
      title: 'Incredible Singapore',
      slug: 'incredible-singapore',
      destination: 'Singapore',
      duration: '6 Days - 5 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/images-1-2.jpg',
    },
  ];

  const DESTINATIONS = [
    {
      name: 'Dubai',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/images-2-1.jpg',
      href: '/tours/the-ultimate-dubai-experience',
    },
    {
      name: 'Ghana',
      image: 'https://sunseekerstours.com/wp-content/uploads/2025/11/Black-star-square.png',
      href: '/tours/ghana',
    },
    {
      name: 'Namibia',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Namibia.jpg',
      href: '/destinations',
    },
    {
      name: 'Rwanda',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Rwanda.webp',
      href: '/tours/asambe-south-africa',
    },
    {
      name: 'Seychelles',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/04/images-1.jpg',
      href: '/tours/desert-dream-getaway',
    },
  ];

  const SERVICES = [
    {
      title: 'Tour Ghana',
      desc: 'Heritage, cultural celebrations, historical castles, and scenic safaris across all 16 regions of Ghana.',
      emoji: '🏛️',
      href: '/tours/ghana',
    },
    {
      title: 'International Trips',
      desc: 'World adventure tours to Dubai, Singapore, Rwanda, Seychelles, Malaysia, and exotic global destinations.',
      emoji: '✈️',
      href: '/tours/international',
    },
    {
      title: 'Hotel Reservation',
      desc: 'Hand-picked luxury resorts, boutique villas, and business hotels worldwide with exclusive rates.',
      emoji: '🏨',
      href: '/hotels',
    },
    {
      title: 'Vehicle Rental & Flights',
      desc: 'Comprehensive transportation with chauffeur-driven 4x4s, tourist coaches, and global flight ticketing.',
      emoji: '🚗',
      href: '/car-rentals',
    },
  ];

  return (
    <>
      {/* =========================================================================
          1. Hero Section (Screenshot 1)
          ========================================================================= */}
      <section className="hero-home">
        <div className="hero-home-content">
          <h1 className="hero-home-title">Welcome to Sunseekers Tours</h1>
          <p className="hero-home-subtitle">...Memories of our Tours are Forever</p>
          <div className="hero-actions">
            <Link href="/tours" className="btn btn-primary">
              Explore Our Tours
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Plan Custom Trip
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Trending Tours Section (Screenshot 2)
          ========================================================================= */}
      <section className="section">
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">Top Recommendations</div>
            <h2 className="section-title">Trending Tours</h2>
            <p className="section-subtitle">
              Discover our most sought-after cultural tours, festival getaways, and worldwide adventures.
            </p>
          </div>

          <div className="grid-3">
            {TRENDING_TOURS.map((tour) => (
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

      {/* =========================================================================
          3. Explore our Destinations Section (Screenshot 3)
          ========================================================================= */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">Handcrafted Journeys</div>
            <h2 className="section-title">Explore our Destinations</h2>
            <p className="section-subtitle">
              Discover our range of handcrafted destinations waiting to be discovered
            </p>
          </div>

          <div className="destinations-gallery-container">
            {DESTINATIONS.map((dest) => (
              <Link key={dest.name} href={dest.href} className="destination-capsule-card">
                <div className="destination-capsule-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest.image}
                    alt={dest.name}
                    loading="lazy"
                  />
                </div>
                <div className="destination-capsule-label">{dest.name}</div>
              </Link>
            ))}
          </div>

          <div className="destination-dots">
            <span className="dest-dot active" />
            <span className="dest-dot" />
            <span className="dest-dot" />
            <span className="dest-dot" />
            <span className="dest-dot" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. What We Offer Section (Screenshot 3)
          ========================================================================= */}
      <section className="section">
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">OUR SERVICES</div>
            <h2 className="section-title">What We Offer</h2>
            <p className="section-subtitle">
              Discover our range of travel services designed to make your journey unforgettable
            </p>
          </div>

          <div className="services-grid">
            {SERVICES.map((serv) => (
              <Link key={serv.title} href={serv.href} className="service-box">
                <div className="service-icon-wrap">{serv.emoji}</div>
                <h3>{serv.title}</h3>
                <p>{serv.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. Stats Counter Banner (Screenshot 4)
          ========================================================================= */}
      <section className="stats-banner">
        <div className="container">
          <div className="stats-grid-container">
            <div className="stat-item">
              <div className="stat-icon">✈️</div>
              <div>
                <div className="stat-number">600+</div>
                <div className="stat-text">Flight bookings</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">🌍</div>
              <div>
                <div className="stat-number">300+</div>
                <div className="stat-text">Amazing Tours</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">🚢</div>
              <div>
                <div className="stat-number">50+</div>
                <div className="stat-text">Cruises</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">🚗</div>
              <div>
                <div className="stat-number">50K+</div>
                <div className="stat-text">Vehicle Rentals</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. Our Awards & Partners (Screenshot 4)
          ========================================================================= */}
      <section className="section" style={{ background: '#ffffff', paddingBottom: '32px' }}>
        <div className="container">
          {/* Awards */}
          <div className="section-head-center" style={{ marginBottom: '24px' }}>
            <h2 className="section-title" style={{ fontSize: '1.8rem' }}>Our Awards</h2>
            <p className="section-subtitle">
              With award-winning services we specialize in corporate and leisure travel excellence.
            </p>
          </div>

          <div className="awards-showcase">
            <div className="award-item">
              <div className="award-trophy">🏆</div>
              <div className="award-label">Ghana Tourism Awards Winner</div>
            </div>
            <div className="award-item">
              <div className="award-trophy">🥇</div>
              <div className="award-label">Top Tour Operator of the Year</div>
            </div>
            <div className="award-item">
              <div className="award-trophy">🎖️</div>
              <div className="award-label">Excellence in Hospitality</div>
            </div>
            <div className="award-item">
              <div className="award-trophy">⭐</div>
              <div className="award-label">Best Corporate Travel Partner</div>
            </div>
            <div className="award-item">
              <div className="award-trophy">🛡️</div>
              <div className="award-label">Sustainable Tourism Certified</div>
            </div>
          </div>

          {/* Partners */}
          <div className="section-head-center" style={{ marginTop: '56px', marginBottom: '20px' }}>
            <h2 className="section-title" style={{ fontSize: '1.8rem' }}>Our Partners</h2>
          </div>

          <div className="partners-showcase">
            <div className="partner-logo-pill">1DMC Africa</div>
            <div className="partner-logo-pill">Travelife Partner</div>
            <div className="partner-logo-pill">Ghana Tourism Authority</div>
            <div className="partner-logo-pill">TOUGHA</div>
            <div className="partner-logo-pill">Beyond The Return</div>
          </div>
        </div>
      </section>
    </>
  );
}
