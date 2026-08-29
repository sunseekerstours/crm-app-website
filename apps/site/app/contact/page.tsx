import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Sunseekers Travel',
  description: 'Get in touch with Sunseekers Travel to plan your journey.',
};

export default function ContactPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <div>
            <div className="eyebrow">Contact</div>
            <h1 style={{ fontSize: '2.2rem', margin: '8px 0 12px' }}>Plan your journey</h1>
            <p style={{ color: 'var(--muted)', maxWidth: '46ch' }}>
              Tell us where you’d like to go, how you love to travel, and our
              designers will craft a bespoke itinerary just for you. No
              obligation — just inspiration.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 24 }}>
              <li style={{ marginBottom: 10 }}>
                <strong>Email:</strong> hello@sunseekers.travel
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong>Phone:</strong> +1 (555) 010-2030
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong>Office:</strong> 12 Harbour Walk, Travel City
              </li>
            </ul>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.3rem', marginTop: 0 }}>Send us a message</h2>
            <form
              style={{ display: 'grid', gap: 14 }}
              action="/contact"
              method="post"
            >
              <div style={{ display: 'grid', gap: 4 }}>
                <label htmlFor="name" style={{ fontWeight: 600 }}>
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    font: 'inherit',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <label htmlFor="email" style={{ fontWeight: 600 }}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    font: 'inherit',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <label htmlFor="message" style={{ fontWeight: 600 }}>
                  Where would you like to go?
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    font: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ border: 'none', width: 'fit-content' }}
              >
                Send Enquiry
              </button>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                This is a demo contact form. Enquiries are logged client-side
                for demonstration.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
