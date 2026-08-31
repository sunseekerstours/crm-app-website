import type { Metadata } from 'next';
import FlightBookingForm from '@/components/FlightBookingForm';
import PageHeroSlider from '@/components/PageHeroSlider';

export const metadata: Metadata = {
  title: 'Flight Bookings & Air Ticketing | Sunseekers Tours',
  description:
    'Domestic and international flight ticketing, group charters, and corporate travel reservations with Sunseekers Tours.',
};

const FLIGHT_HERO_SLIDES = [
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?q=80&w=1920&auto=format&fit=crop',
];

export default function FlightsPage() {
  return (
    <>
      {/* 4-Slide Auto-Transitioning Hero Banner */}
      <PageHeroSlider
        slides={FLIGHT_HERO_SLIDES}
        defaultEyebrow="SEAMLESS GLOBAL TRAVEL"
        defaultTitle="Flight Reservations &amp; Ticketing"
        defaultSubtitle="Competitive fares and seamless connections to domestic and worldwide destinations"
        height="390px"
      />

      {/* Flight Booking Form */}
      <section className="section" style={{ background: '#f8fafc', padding: '60px 0 80px' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <FlightBookingForm />
        </div>
      </section>

      {/* Why Fly With Sunseekers */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">Aviation Partners</div>
            <h2 className="section-title">Worldwide Airline Connections</h2>
            <p className="section-subtitle">
              We partner with premier global airlines to provide flexible routing, baggage allowances, and best available fares.
            </p>
          </div>

          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎫</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Corporate Air Travel</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Tailored corporate flight itineraries, invoicing, flexible date changes, and executive lounge access.</p>
            </div>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Group Flight Bookings</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Special group rates for conferences, festival attendees, student tours, and family reunions.</p>
            </div>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Changes &amp; Re-routing</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Dedicated 24/7 support for schedule changes, flight delays, seat selection, and emergency re-ticketing.</p>
            </div>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛄</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Charter Flights</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Private aircraft charter solutions across West Africa and remote destination access.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
