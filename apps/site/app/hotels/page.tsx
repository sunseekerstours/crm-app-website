import type { Metadata } from 'next';
import HotelBookingForm from '@/components/HotelBookingForm';
import PageHeroSlider from '@/components/PageHeroSlider';

export const metadata: Metadata = {
  title: 'Premium Accommodations & Hotel Reservations | Sunseekers Tours',
  description:
    'Book curated luxury hotel accommodations, boutique resorts, and premium suites in Ghana and worldwide with Sunseekers Tours.',
};

const HOTEL_HERO_SLIDES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1920&auto=format&fit=crop',
];

export default function HotelsPage() {
  return (
    <>
      {/* 4-Slide Auto-Transitioning Hero Banner */}
      <PageHeroSlider
        slides={HOTEL_HERO_SLIDES}
        defaultEyebrow="CURATED STAYS &amp; RESILIENCE"
        defaultTitle="Premium Accommodations"
        defaultSubtitle="Find the perfect luxury resort, boutique villa, and executive suites for your journey"
        height="390px"
      />

      {/* Booking Form Section */}
      <section className="section" style={{ background: '#f8fafc', padding: '60px 0 80px' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
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

          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏖️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Beachfront Resorts</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Tropical coastal getaways in Busua, Ada Foah, Seychelles, and Dubai with private shoreline access.</p>
            </div>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏙️</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>City Executive Suites</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Centrally located hotels in Accra, Singapore, and Nairobi with business centers and fast WiFi.</p>
            </div>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌿</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Safari Eco-Lodges</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Serene nature retreats near Mole National Park, Kakum canopy walk, and Rwandan volcano ranges.</p>
            </div>
            <div className="card" style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👑</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Boutique Villas</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5' }}>Exclusive private villas and tailored residences offering personalized chef and concierge services.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
