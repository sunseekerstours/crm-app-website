import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us | Sunseekers Tours',
  description:
    'Learn more about Sunseekers Tours, Ghana’s leading destination management company and bespoke tour operator.',
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero-banner" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1920&auto=format&fit=crop')" }}>
        <div>
          <h1>About Sunseekers Tours</h1>
          <p>...Memories of our Tours are Forever</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="section-head-center">
            <div className="section-eyebrow">Our Story</div>
            <h2 className="section-title">Crafting Unforgettable Journeys Since Inception</h2>
          </div>

          <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p>
              Sunseekers Tours is a full-fledged Destination Management Company (DMC) and accredited tour operator based in Accra, Ghana. We specialize in providing unforgettable travel experiences across Ghana, West Africa, and premier international destinations.
            </p>
            <p>
              With decades of collective experience, our dedicated team of travel professionals, expert tour guides, and transport logistics specialists are committed to delivering exceptional hospitality, safety, and cultural immersion to leisure and corporate travelers worldwide.
            </p>
            <p>
              Whether you are discovering the historical heritage of Cape Coast and Elmina, experiencing the energetic rhythms of the Chale Wote and Afrofuture festivals, or venturing into world adventure getaways in Dubai, Singapore, and Seychelles, we ensure every detail of your journey is seamless.
            </p>
          </div>

          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Link href="/tours" className="btn btn-primary">
              View Our Tours
            </Link>
            <Link href="/contact" className="btn btn-green">
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
