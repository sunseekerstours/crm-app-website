import type { Metadata } from 'next';
import Link from 'next/link';
import { apiGet, ProductPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Flights | Sunseekers Travel',
  description: 'Flight booking and air travel services with Sunseekers Travel.',
};

export default async function FlightsPage() {
  let products: ProductPublic[] = [];
  let error = false;
  try {
    products = await apiGet<ProductPublic[]>('/public/products?category=FLIGHT');
  } catch {
    error = true;
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Air Travel</div>
          <h2>Flights</h2>
          <p>
            {error
              ? 'We couldn’t load our flight services right now.'
              : products.length > 0
                ? `${products.length} flight product${products.length === 1 ? '' : 's'} available.`
                : 'Flight options are being added — contact us to book your air travel.'}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-3">
            {products.map((p) => (
              <div key={p.id} className="card">
                <div className="card-body">
                  <h3 style={{ marginBottom: 6 }}>{p.name}</h3>
                  <div className="meta" style={{ marginBottom: 6 }}>
                    <span>{p.category.replace('_', ' ')}</span>
                  </div>
                  {p.description ? <p style={{ color: 'var(--muted)' }}>{p.description}</p> : null}
                  {p.price != null ? (
                    <div style={{ fontWeight: 600, marginTop: 8 }}>
                      {p.price} {p.currency}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ margin: 0 }}>
              {error
                ? 'Flight services are temporarily unavailable.'
                : 'No flight products published yet.'}{' '}
              <Link href="/contact" className="link-arrow">
                Enquire about flights
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
