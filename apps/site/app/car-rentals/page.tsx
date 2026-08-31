import type { Metadata } from 'next';
import VehicleBookingForm from '@/components/VehicleBookingForm';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Vehicle Rental & Fleet Services | Sunseekers Tours',
  description:
    'Rent 4x4 SUVs, luxury saloons, mini-buses, and tourist coaches across Ghana with experienced professional chauffeurs.',
};

export default function CarRentalsPage() {
  return (
    <>
      {/* Hero Banner */}
      <section
        className="page-hero-banner"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1920&auto=format&fit=crop')",
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', color: '#fed7aa', marginBottom: '8px' }}>
            Safe, Reliable &amp; Air-Conditioned
          </div>
          <h1>Vehicle Rental &amp; Logistics</h1>
          <p>Comfortable chauffeur-driven fleets across Ghana</p>
        </div>
      </section>

      {/* Vehicle Booking Form */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <VehicleBookingForm />
        </div>
      </section>

      {/* Our Fleet Showcase */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-head-center">
            <div className="section-eyebrow">Our Modern Fleet</div>
            <h2 className="section-title">Vehicles for Every Travel Need</h2>
            <p className="section-subtitle">
              All vehicles are comprehensively insured, equipped with full air-conditioning, and driven by licensed professionals.
            </p>
          </div>

          <div className="services-grid">
            <div className="service-box">
              <div className="service-icon-wrap">🚙</div>
              <h3>4x4 Land Cruisers &amp; Prados</h3>
              <p>Ideal for safari expeditions to Mole National Park, off-road terrain, and VIP executive transfers.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">🚘</div>
              <h3>Executive Saloon Cars</h3>
              <p>Toyota Camry and Mercedes sedans for corporate business meetings, weddings, and city transit.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">🚐</div>
              <h3>15-Seater Mini-Buses</h3>
              <p>Toyota HiAce buses with luggage compartments, ideal for small tour groups and family travel.</p>
            </div>
            <div className="service-box">
              <div className="service-icon-wrap">🚌</div>
              <h3>30–50 Seater Coaches</h3>
              <p>Coaster and luxury tourist coaches for conferences, school excursions, and large festival groups.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
