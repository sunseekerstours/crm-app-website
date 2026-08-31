'use client';

import { useState } from 'react';
import Link from 'next/link';
import TourQuoteForm from './TourQuoteForm';
import { TourPublic } from '@/lib/api';

export default function TourDetailClient({
  tour,
  relatedTours,
}: {
  tour: TourPublic;
  relatedTours: Array<{
    title: string;
    slug: string;
    destination: string;
    duration: string;
    image: string;
  }>;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'cost'>('overview');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const defaultItinerary = [
    {
      day: 1,
      title: 'Day 01 - Arrival Day',
      desc: 'Touch down in Ghana amidst the warmth wish and smile. Meet and Greet, Transfer to Hotel. Dinner in your hotel (on own account) / Optional evening activities. Overnight in 4* Hotel in Accra.',
    },
    {
      day: 2,
      title: 'Day 02 - Accra City Tour & Nightlife',
      desc: 'Immerse in the soul of Ghana’s capital — its history, people, and vibrant culture. Morning & Afternoon: National Museum, Old Accra Exploration (James Fort and Lighthouse), Kwame Nkrumah Memorial Park, Arts & Crafts Market.',
    },
    {
      day: 3,
      title: 'Day 03 - Cape Coast Castle & Canopy Walk',
      desc: 'Travel to the Central Region. Walk across the famous Kakum National Park canopy walkway 40 meters above the forest floor. Tour the historic Cape Coast Castle UNESCO World Heritage Site.',
    },
    {
      day: 4,
      title: 'Day 04 - Elmina Castle & Ancestral Slave River',
      desc: 'Visit the historic Elmina Castle and Assin Manso Ancestral Slave River park (where enslaved ancestors took their "last bath"). Cultural drumming and evening beach bonfire.',
    },
    {
      day: 5,
      title: 'Day 05 - Kumasi & The Ashanti Kingdom',
      desc: 'Journey into Kumasi, the seat of the Ashanti Empire. Visit Manhyia Palace Museum, Okomfo Anokye Sword site, and explore Kejetia Market, West Africa’s largest open-air market.',
    },
    {
      day: 6,
      title: 'Day 06 - Kente Weaving & Craft Villages',
      desc: 'Visit the Bonwire Kente weaving village and Ahwiaa woodcarving craft center. Meet master artisans and weave your own custom Kente strip.',
    },
    {
      day: 7,
      title: 'Day 07 - Afrofuture / Cultural Festival Celebrations',
      desc: 'Experience high-energy live concerts, contemporary African fashion, music, and culinary delights at the festival grounds with VIP access.',
    },
    {
      day: 8,
      title: 'Day 08 - Relaxation & Departure',
      desc: 'Morning at leisure by the pool or beachfront. Last-minute souvenir shopping at the Accra Arts Center followed by airport transfer for international flight home.',
    },
  ];

  const itineraryDays = tour.days && tour.days.length > 0
    ? tour.days.map((d) => ({
        day: d.dayNumber,
        title: `Day ${String(d.dayNumber).padStart(2, '0')} - ${d.title}`,
        desc: d.description,
      }))
    : defaultItinerary;

  const defaultIncludes = [
    '12 Nights Accommodation in 4/5* Hotels',
    'Daily Buffet Breakfast',
    'English-Speaking Professional Tour Guides',
    'All Entry Fees to Tour Sites & Parks',
    'Airport Transfers - Arrival & Departure',
    'Transportation in Air-Conditioned Buses throughout the tour',
    'Complimentary Bottled Water each day',
  ];

  const defaultExcludes = [
    'International Flights - To and from Ghana',
    'Travel Visa Fees',
    'Travel Insurance',
    'Lunch & Dinner - Except where stated in itinerary',
    'Personal Expenses - Souvenirs, tips, laundry, phone calls',
    'Optional tours/activities not listed in itinerary',
    'COVID / Health Testing if required',
  ];

  return (
    <>
      {/* =========================================================================
          1. Hero Header Banner (Screenshot 4)
          ========================================================================= */}
      <section
        className="tour-detail-hero-banner"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.6)), url('${
            tour.coverImage ||
            'https://sunseekerstours.com/wp-content/uploads/2026/08/Photo-by-Afronation-com-1024x576-1.jpeg'
          }')`,
        }}
      >
        <div className="container" style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', paddingBottom: '32px' }}>
          <div style={{ color: '#fff', maxWidth: '800px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ background: '#f37023', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                {tour.destinations?.[0]?.destination?.name || 'Featured Tour'}
              </span>
              <span style={{ fontSize: '13px', opacity: 0.9 }}>📍 Sunseekers Verified Tour</span>
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '900', margin: '0 0 8px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {tour.name}
            </h1>
            <p style={{ fontSize: '16px', opacity: 0.95, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {tour.summary}
            </p>
          </div>

          <div style={{ position: 'absolute', right: '16px', bottom: '32px' }}>
            <span style={{ background: '#008744', color: '#fff', padding: '8px 18px', borderRadius: '6px', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
              <span>⏳</span> {tour.durationDays} Days
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. Tabs Navigation & Main Content (Screenshots 4 & 5)
          ========================================================================= */}
      <section className="section" style={{ background: '#ffffff', paddingTop: '24px' }}>
        <div className="container">
          {/* Breadcrumbs & Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: activeTab === 'overview' ? '#008744' : '#64748b',
                  borderBottom: activeTab === 'overview' ? '3px solid #008744' : 'none',
                  paddingBottom: '12px',
                  cursor: 'pointer',
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('itinerary')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: activeTab === 'itinerary' ? '#008744' : '#64748b',
                  borderBottom: activeTab === 'itinerary' ? '3px solid #008744' : 'none',
                  paddingBottom: '12px',
                  cursor: 'pointer',
                }}
              >
                Itinerary
              </button>
              <button
                onClick={() => setActiveTab('cost')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: activeTab === 'cost' ? '#008744' : '#64748b',
                  borderBottom: activeTab === 'cost' ? '3px solid #008744' : 'none',
                  paddingBottom: '12px',
                  cursor: 'pointer',
                }}
              >
                Cost &amp; Inclusions
              </button>
            </div>

            <div style={{ fontSize: '14px', color: '#64748b' }}>
              <Link href="/" style={{ color: '#008744', fontWeight: '600' }}>Home</Link> / <Link href="/tours" style={{ color: '#008744', fontWeight: '600' }}>Tours</Link> / {tour.name}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px' }} className="tour-detail-layout">
            {/* Left Column: Tab Contents */}
            <div>
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div>
                  {/* Pricing Box (Screenshot 4) */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#166534', marginBottom: '8px' }}>
                      23rd Dec 2026 - 3rd Jan 2027
                    </div>
                    <div style={{ fontSize: '13px', color: '#15803d', marginBottom: '14px', fontWeight: '600' }}>
                      Rates based on Min. 10 Travelers:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>Double Occupancy</span>
                        <span style={{ fontWeight: '800', color: '#f37023', fontSize: '18px' }}>$3,160 <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Per Person sharing a Room</span></span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>Single Occupancy</span>
                        <span style={{ fontWeight: '800', color: '#f37023', fontSize: '18px' }}>$3,835 <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Per Person in a room</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Description text */}
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                    About This Journey
                  </h3>
                  <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-line', marginBottom: '24px' }}>
                    {tour.description || tour.summary}
                  </div>

                  {/* Highlights if present */}
                  {tour.highlights && tour.highlights.length > 0 && (
                    <div style={{ marginBottom: '28px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                        Trip Highlights
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                        {tour.highlights.map((h, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#334155' }}>
                            <span style={{ color: '#008744', fontWeight: 'bold' }}>✓</span>
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Itinerary Preview */}
                  <div style={{ marginTop: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        Itinerary
                      </h3>
                      <button
                        onClick={() => setActiveTab('itinerary')}
                        style={{ background: 'none', border: 'none', color: '#008744', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                      >
                        View Full Schedule →
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {itineraryDays.slice(0, 3).map((d) => (
                        <div key={d.day} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px', background: '#f8fafc' }}>
                          <div style={{ fontWeight: '700', color: '#008744', fontSize: '15px', marginBottom: '4px' }}>
                            {d.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                            {d.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Itinerary (Screenshot 4) */}
              {activeTab === 'itinerary' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      Detailed Day-by-Day Itinerary
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {itineraryDays.map((d) => (
                      <div
                        key={d.day}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: '#fff',
                        }}
                      >
                        <button
                          onClick={() => setExpandedDay(expandedDay === d.day ? null : d.day)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            background: expandedDay === d.day ? '#f0fdf4' : '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ background: '#008744', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                              {d.day}
                            </span>
                            <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
                              {d.title}
                            </span>
                          </div>
                          <span style={{ color: '#008744', fontWeight: 'bold', fontSize: '18px' }}>
                            {expandedDay === d.day ? '−' : '+'}
                          </span>
                        </button>

                        {(expandedDay === d.day || expandedDay === null) && (
                          <div style={{ padding: '0 20px 18px 60px', fontSize: '14px', lineHeight: 1.7, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                            {d.desc}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Cost & Inclusions (Screenshot 5) */}
              {activeTab === 'cost' && (
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>
                    Includes / Excludes
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }} className="includes-grid">
                    {/* Includes */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '20px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#166534', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✅</span> What Is Included
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {defaultIncludes.map((item, i) => (
                          <li key={i} style={{ fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Excludes */}
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '20px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#991b1b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>❌</span> What Is Not Included
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {defaultExcludes.map((item, i) => (
                          <li key={i} style={{ fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Embedded Quote Form (Screenshot 5) */}
              <TourQuoteForm tourName={tour.name} />
            </div>

            {/* Right Column: Why Book With Us Card (Screenshot 4 & 5) */}
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', position: 'sticky', top: '90px' }}>
                <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  Why Book With Us?
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#e0f2fe', color: '#0284c7', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                      📞
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Customer care available 24/7</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Always on hand for travel assistance</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#fef3c7', color: '#d97706', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                      📍
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Exceptional Locations</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Hand-picked top-rated hotels &amp; lodges</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#dcfce7', color: '#16a34a', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                      ✨
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Hand-picked Tourist Activities</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Authentic cultural &amp; festival immersions</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#ffedd5', color: '#ea580c', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                      🏷️
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Best Price Guarantee</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Direct operator rates without middlemen</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Have questions about this tour?</div>
                  <a
                    href="tel:+233244311267"
                    className="btn btn-green"
                    style={{ width: '100%', textAlign: 'center', padding: '10px', fontSize: '14px', fontWeight: '700', display: 'block' }}
                  >
                    📞 Call +233 244 311 267
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              3. Related Trips Carousel / Grid (Screenshot 5)
              ========================================================================= */}
          {relatedTours && relatedTours.length > 0 && (
            <div style={{ marginTop: '64px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
              <div className="section-head-center" style={{ marginBottom: '28px' }}>
                <h3 className="section-title" style={{ fontSize: '24px' }}>Related Trips</h3>
              </div>

              <div className="grid-3">
                {relatedTours.map((rel) => (
                  <div key={rel.slug} className="tour-card">
                    <div className="tour-card-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={rel.image} alt={rel.title} loading="lazy" />
                      <div className="tour-card-badge">{rel.destination}</div>
                      <button className="tour-card-heart" title="Save to Favorites" aria-label="Favorite">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                      </button>
                    </div>

                    <div className="tour-card-body">
                      <div className="tour-card-dest">
                        <span>📍 {rel.destination}</span>
                      </div>
                      <h3 className="tour-card-title">{rel.title}</h3>

                      <div className="tour-card-meta">
                        <div className="tour-card-duration">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{rel.duration}</span>
                        </div>
                        <span className="tour-card-price">Best Value</span>
                      </div>

                      <Link href={`/tours/${rel.slug}`} className="btn-view-details">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
