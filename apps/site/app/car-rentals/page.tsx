import type { Metadata } from 'next';
import Link from 'next/link';
import { apiGet, ProductPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Car Rentals | Sunseekers Travel',
  description: 'Car rental and ground transport services with Sunseekers Travel.',
};

export default async function CarRentalsPage() {
  let products: ProductPublic[] = [];
  let error = false;
  try {
    products = await apiGet<ProductPublic[]>('/public/products?category=CAR_RENTAL');
  } catch {
    error = true;
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Drive your way</div>
          <h2>Car Rentals</h2>
          <p>
            {error
              ? 'We couldn’t load our car rental services right now.'
              : products.length > 0
                ? `${products.length} car rental option${products.length === 1 ? '' : 's'} available.`
                : 'Car rental options are being added — contact us to arrange transport.'}
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
                ? 'Car rental services are temporarily unavailable.'
                : 'No car rental products published yet.'}{' '}
              <Link href="/contact" className="link-arrow">
                Enquire about car rentals
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
