'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export interface TrendingTour {
  title: string;
  slug: string;
  destination: string;
  duration: string;
  image: string;
  tag?: string;
}

export interface DestinationItem {
  name: string;
  country: string;
  image: string;
  href: string;
}

const HERO_SLIDES = [
  {
    id: 1,
    title: 'Celebrate 13 Years of Unforgettable Journeys',
    subtitle: 'Join us this anniversary and feel the joy. ...Memories of our Tours are Forever.',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1920&auto=format&fit=crop',
    tag: '★ 13TH ANNIVERSARY SPECIAL ★',
    ctaText: 'Explore Our Tours',
    ctaLink: '/tours',
  },
  {
    id: 2,
    title: 'Discover the Soul & Heritage of Ghana',
    subtitle: 'From historic Cape Coast castles to Kakum canopy walkways, Ashanti culture & vibrant festivals.',
    image: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=1920&auto=format&fit=crop',
    tag: '🇬🇭 YEAR OF RETURN & BEYOND',
    ctaText: 'Tour Ghana Packages',
    ctaLink: '/tours/ghana',
  },
  {
    id: 3,
    title: 'Worldwide Adventures & Luxury Escapes',
    subtitle: 'Explore Dubai skylines, Zanzibar turquoise beaches, Kenya safaris, Singapore & exotic destinations.',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1920&auto=format&fit=crop',
    tag: '✈️ GLOBAL EXPEDITIONS',
    ctaText: 'International Trips',
    ctaLink: '/tours/international',
  },
];

const ALL_DESTINATIONS: DestinationItem[] = [
  {
    name: 'Ghana',
    country: 'West Africa',
    image: 'https://sunseekerstours.com/wp-content/uploads/2025/11/Black-star-square.png',
    href: '/tours/ghana',
  },
  {
    name: 'Dubai',
    country: 'UAE',
    image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/images-2-1.jpg',
    href: '/tours/the-ultimate-dubai-experience',
  },
  {
    name: 'Singapore',
    country: 'Southeast Asia',
    image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Universal-Studios-Singapore.jpg',
    href: '/tours/explore-singapore-malaysia',
  },
  {
    name: 'Namibia',
    country: 'Southern Africa',
    image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Namibia.jpg',
    href: '/destinations',
  },
  {
    name: 'Rwanda',
    country: 'East Africa',
    image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Rwanda.webp',
    href: '/destinations',
  },
  {
    name: 'Seychelles',
    country: 'Indian Ocean',
    image: 'https://sunseekerstours.com/wp-content/uploads/2026/04/images-1.jpg',
    href: '/destinations',
  },
  {
    name: 'Zanzibar',
    country: 'Tanzania',
    image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=800&auto=format&fit=crop',
    href: '/destinations',
  },
  {
    name: 'South Africa',
    country: 'Cape Town & Safari',
    image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop',
    href: '/destinations',
  },
  {
    name: 'Cairo & Nile',
    country: 'Egypt',
    image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?q=80&w=800&auto=format&fit=crop',
    href: '/destinations',
  },
  {
    name: 'Kenya Safari',
    country: 'Masai Mara',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    href: '/destinations',
  },
];

export default function HomeClient({
  trendingTours,
  services,
}: {
  trendingTours: TrendingTour[];
  services: { title: string; desc: string; emoji: string; href: string }[];
}) {
  // Hero Carousel State (Auto transitions every 5 seconds)
  const [currentSlide, setCurrentSlide] = useState(0);

  // Automatic Destination Transition State (Cycles smoothly through destinations)
  const [destStartIndex, setDestStartIndex] = useState(0);

  // Auto-transition hero slides every 5 seconds continuously
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(heroInterval);
  }, []);

  // Auto-transition destinations every 3.5 seconds continuously (5 visible cards shift in order)
  useEffect(() => {
    const destInterval = setInterval(() => {
      setDestStartIndex((prev) => (prev + 1) % ALL_DESTINATIONS.length);
    }, 3500);
    return () => clearInterval(destInterval);
  }, []);

  // Compute the 5 visible destination cards for current window
  const visibleDestinations = [];
  for (let i = 0; i < 5; i++) {
    const idx = (destStartIndex + i) % ALL_DESTINATIONS.length;
    visibleDestinations.push({ ...ALL_DESTINATIONS[idx], uniqueKey: `${ALL_DESTINATIONS[idx].name}-${i}` });
  }

  return (
    <>
      {/* =========================================================================
          1. Hero Section with Automatic Image Transitions
          ========================================================================= */}
      <section className="hero-slider-section">
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className={`hero-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.55)), url('${slide.image}')` }}
          >
            <div className="hero-slide-content">
              <div className="hero-anniversary-badge">{slide.tag}</div>
              <h1 className="hero-home-title">{slide.title}</h1>
              <p className="hero-home-subtitle">{slide.subtitle}</p>
              <div className="hero-actions">
                <Link href={slide.ctaLink} className="btn-hero-primary">
                  {slide.ctaText} &rarr;
                </Link>
                <Link href="/plan-your-trip" className="btn-hero-ghost">
                  Plan Custom Trip
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Hero Navigation Arrows */}
        <button
          className="hero-slider-arrow prev"
          onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          aria-label="Previous Slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          className="hero-slider-arrow next"
          onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
          aria-label="Next Slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Hero Slide Indicators */}
        <div className="hero-dots-wrap">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          2. Trending Tours Section
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
            {trendingTours.map((tour) => (
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

          {/* View All Tours button */}
          <div className="view-all-tours-wrapper">
            <Link href="/tours" className="btn-view-all-tours">
              <span>View All Tours &amp; Holiday Packages</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. Explore our Destinations with 5-Card Auto-Transition Carousel
          ========================================================================= */}
      <section className="section" style={{ background: '#f8fafc', overflow: 'hidden' }}>
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">Handcrafted Journeys</div>
            <h2 className="section-title">Explore our Destinations</h2>
            <p className="section-subtitle">
              Discover our range of handcrafted destinations waiting to be discovered
            </p>
          </div>

          {/* 5 Visible Auto-Transitioning Cards */}
          <div className="destinations-auto-carousel">
            <div className="destinations-5grid">
              {visibleDestinations.map((dest) => (
                <Link
                  key={dest.uniqueKey}
                  href={dest.href}
                  className="destination-capsule-card animated-slide"
                >
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
          </div>

          {/* Animated Indicator Dots */}
          <div className="destination-dots">
            {ALL_DESTINATIONS.map((_, i) => (
              <button
                key={i}
                className={`dest-dot ${i === destStartIndex ? 'active' : ''}`}
                onClick={() => setDestStartIndex(i)}
                aria-label={`Go to destination ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. What We Offer Section
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
            {services.map((serv) => (
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
          5. Stats Counter Banner
          ========================================================================= */}
      <section className="stats-banner">
        <div className="container">
          <div className="stats-grid-container">
            <div className="stat-item">
              <div className="stat-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28 }}>
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </div>
              <div>
                <div className="stat-number">600+</div>
                <div className="stat-text">Flight Bookings</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28 }}>
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 0110.565-.686.75.75 0 00.916-1.189A9.75 9.75 0 004.938 5.228a.75.75 0 001.324.844zM3.75 12a8.204 8.204 0 011.393-4.57.75.75 0 10-1.258-.816A9.704 9.704 0 003 12c0 2.203.732 4.238 1.964 5.875a.75.75 0 001.196-.906A8.203 8.203 0 013.75 12zm16.5 0c0 2.203-.732 4.238-1.964 5.875a.75.75 0 101.196.906A9.704 9.704 0 0021 12a9.704 9.704 0 00-.885-4.086.75.75 0 10-1.378.59A8.204 8.204 0 0120.25 12z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="stat-number">300+</div>
                <div className="stat-text">Amazing Tours</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28 }}>
                  <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
                  <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="stat-number">50+</div>
                <div className="stat-text">Cruises / Hotels</div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28 }}>
                  <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3.75a.75.75 0 00.75-.75V15z" />
                  <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.502h1.125c1.035 0 1.875-.84 1.875-1.875v-4.5a3 3 0 00-.879-2.121l-3.371-3.372a3 3 0 00-2.122-.879H15.75z" />
                  <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                </svg>
              </div>
              <div>
                <div className="stat-number">50K+</div>
                <div className="stat-text">Vehicle Rentals</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. Our Awards & Partners Section
          ========================================================================= */}
      <section className="awards-partners-section">
        <div className="container">
          <div className="section-head-center">
            <h2 className="awards-main-title">Our Awards</h2>
            <p className="awards-main-subtitle">
              With years of touring experience, we have won awards from numerous companies.
            </p>
          </div>

          <div className="awards-showcase-grid">
            <div className="award-card-item">
              <div className="award-graphic-box obelisk-trophy">
                <div className="trophy-gold-star">★</div>
                <div className="trophy-stem" />
                <div className="trophy-base">CIMG</div>
              </div>
              <div className="award-card-title">Tourism Leadership Award</div>
              <div className="award-card-org">CIMG Ghana</div>
            </div>

            <div className="award-card-item">
              <div className="award-graphic-box certificate-plaque">
                <div className="plaque-inner-frame">
                  <div className="plaque-seal">🏅</div>
                  <div className="plaque-line" />
                  <div className="plaque-gold-text">OUTSTANDING</div>
                </div>
              </div>
              <div className="award-card-title">Outstanding Tour Operator</div>
              <div className="award-card-org">Ghana Tourism Authority</div>
            </div>

            <div className="award-card-item">
              <div className="award-graphic-box crystal-shield">
                <div className="shield-seal">⭐</div>
                <div className="shield-text">QUALITY EXCELLENCE</div>
              </div>
              <div className="award-card-title">National Tourism Award</div>
              <div className="award-card-org">National Tourism Board</div>
            </div>

            <div className="award-card-item">
              <div className="award-graphic-box pyramid-trophy">
                <div className="pyramid-cap">▲</div>
                <div className="pyramid-seal">TOUR OPERATOR</div>
                <div className="pyramid-pedestal" />
              </div>
              <div className="award-card-title">Top Tour Operator of the Year</div>
              <div className="award-card-org">Africa Tourism Forum</div>
            </div>

            <div className="award-card-item">
              <div className="award-graphic-box black-crest-plaque">
                <div className="crest-seal">🏆</div>
                <div className="crest-text">WORLD TRAVEL</div>
                <div className="crest-year">EXCELLENCE</div>
              </div>
              <div className="award-card-title">Excellence in Travel</div>
              <div className="award-card-org">World Travel &amp; Hospitality</div>
            </div>
          </div>

          <div className="section-head-center" style={{ marginTop: '56px' }}>
            <h2 className="awards-main-title">Our Partners</h2>
          </div>

          <div className="partners-showcase-grid">
            <div className="partner-badge-card">
              <div className="partner-logo-art dmc-art">
                <span className="partner-globe">🌍</span>
                <span className="dmc-text">1DMC<br /><strong>AFRICA</strong></span>
              </div>
            </div>

            <div className="partner-badge-card">
              <div className="partner-logo-art travelife-art">
                <span className="travelife-leaf">🍃</span>
                <span className="travelife-text">Travelife<br /><small>Sustainability in Tourism</small></span>
              </div>
            </div>

            <div className="partner-badge-card">
              <div className="partner-logo-art tougha-art">
                <span className="tougha-emblem">⌘</span>
                <span className="tougha-text">TOUGHA<br /><small>Tour Operators Union</small></span>
              </div>
            </div>

            <div className="partner-badge-card">
              <div className="partner-logo-art gta-art">
                <span className="gta-eagle">🦅</span>
                <span className="gta-text">GHANA TOURISM<br /><strong>AUTHORITY</strong></span>
              </div>
            </div>

            <div className="partner-badge-card">
              <div className="partner-logo-art btr-art">
                <span className="btr-star">★</span>
                <span className="btr-text">BEYOND<br /><strong>THE RETURN</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
