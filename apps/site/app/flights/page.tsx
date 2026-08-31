import type { Metadata } from 'next';
import FlightBookingForm from '@/components/FlightBookingForm';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Flight Bookings & Air Ticketing | Sunseekers Tours',
  description:
    'Domestic and international flight ticketing, group charters, and corporate travel reservations with Sunseekers Tours.',
};

export default function FlightsPage() {
  return (
    <>
      {/* Hero Banner */}
      <section
        className="page-hero-banner"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1920&auto=format&fit=crop')",
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', color: '#fed7aa', marginBottom: '8px' }}>
            Seamless Global Travel
          </div>
          <h1>Flight Reservations &amp; Ticketing</h1>
          <p>Competitive fares to worldwide destinations</p>
        </div>
      </section>

      {/* Flight Booking Form */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
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

          <div className="services-grid">
            <div className="service-box">
              <div className="service-icon-wrap">🎫</div>
              <h3>Corporate Air Travel</h3>
              <p>Tailored corporate flight itineraries, invoicing, flexible date changes, and executive lounge access.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">👥</div>
              <h3>Group Flight Bookings</h3>
              <p>Special group rates for conferences, festival attendees, student tours, and family reunions.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">🔄</div>
              <h3>Changes &amp; Re-routing</h3>
              <p>Dedicated 24/7 support for schedule changes, flight delays, seat selection, and emergency re-ticketing.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">🛄</div>
              <h3>Charter Flights</h3>
              <p>Private aircraft charter solutions across West Africa and remote destination access.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
