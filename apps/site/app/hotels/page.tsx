import type { Metadata } from 'next';
import HotelBookingForm from '@/components/HotelBookingForm';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Premium Accommodations & Hotel Reservations | Sunseekers Tours',
  description:
    'Book curated luxury hotel accommodations, boutique resorts, and premium suites in Ghana and worldwide with Sunseekers Tours.',
};

export default function HotelsPage() {
  return (
    <>
      {/* Hero Banner (Screenshot 1) */}
      <section
        className="page-hero-banner"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.65)), url('https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1920&auto=format&fit=crop')",
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', color: '#fed7aa', marginBottom: '8px' }}>
            Curated Stays &amp; Resilience
          </div>
          <h1>Premium Accommodations</h1>
          <p>Find the perfect stay for your journey</p>
        </div>
      </section>

      {/* Booking Form Section (Screenshot 1) */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <HotelBookingForm />
        </div>
      </section>

      {/* Curated Hotel Types */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">Luxury &amp; Comfort</div>
            <h2 className="section-title">Handpicked Accommodations Worldwide</h2>
            <p className="section-subtitle">
              From 5-star oceanfront resorts to heritage safari lodges and executive business suites.
            </p>
          </div>

          <div className="services-grid">
            <div className="service-box">
              <div className="service-icon-wrap">🏖️</div>
              <h3>Beachfront Resorts</h3>
              <p>Tropical coastal getaways in Busua, Ada Foah, Seychelles, and Dubai with private shoreline access.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">🏙️</div>
              <h3>City Executive Suites</h3>
              <p>Centrally located hotels in Accra, Singapore, and Nairobi with business centers and fast WiFi.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">🌿</div>
              <h3>Safari Eco-Lodges</h3>
              <p>Serene nature retreats near Mole National Park, Kakum canopy walk, and Rwandan volcano ranges.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">👑</div>
              <h3>Boutique Villas</h3>
              <p>Exclusive private villas and tailored residences offering personalized chef and concierge services.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
