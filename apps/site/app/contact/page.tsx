import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us | Sunseekers Tours',
  description: 'Get in touch with Sunseekers Tours to plan your bespoke journey, hotel bookings, flights, and vehicle rentals.',
};

export default function ContactPage() {
  return (
    <>
      <section
        className="page-hero-banner"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.65)), url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1920&auto=format&fit=crop')",
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', color: '#fed7aa', marginBottom: '8px' }}>
            We’re Here to Help
          </div>
          <h1>Contact Sunseekers Tours</h1>
          <p>...Memories of our Tours are Forever</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'start' }}>
            <div>
              <div className="section-eyebrow">Get In Touch</div>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 16px', color: '#0f172a', fontWeight: '800' }}>
                Plan Your Next Journey
              </h2>
              <p style={{ color: '#475569', lineHeight: '1.7', marginBottom: '32px' }}>
                Tell us where you’d like to go and how you love to travel. Our experienced tour designers and logistics specialists will craft a bespoke itinerary tailored just for you.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#e0f2fe', color: '#0284c7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    📍
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>Office Address</div>
                    <div style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                      8 Farrar Avenue Opposite Trust Towers, Adabraka, Accra - Ghana
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#dcfce7', color: '#16a34a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    📞
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>Telephone &amp; WhatsApp</div>
                    <div style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                      +233 302 227 084 / +233 244 311 267
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#ffedd5', color: '#ea580c', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    ✉️
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>Email Inquiries</div>
                    <div style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                      info@sunseekerstours.com / sunseekerstours@yahoo.com
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: '32px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: 0, marginBottom: '6px', color: '#0f172a' }}>
                Send Us a Message
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                Fill in the details below and a travel coordinator will get in touch with you.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
