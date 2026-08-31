import type { Metadata } from 'next';
import Link from 'next/link';
import { apiGet, ProductPublic } from '@/lib/api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Hotels | Sunseekers Travel',
  description: 'Hotel accommodation and hospitality services with Sunseekers Travel.',
};

export default async function HotelsPage() {
  let products: ProductPublic[] = [];
  let error = false;
  try {
    products = await apiGet<ProductPublic[]>('/public/products?category=HOTEL');
  } catch {
    error = true;
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Stay with us</div>
          <h2>Hotels</h2>
          <p>
            {error
              ? 'We couldn’t load our accommodation services right now.'
              : products.length > 0
                ? `${products.length} hotel option${products.length === 1 ? '' : 's'} available.`
                : 'Hotel options are being added — contact us to arrange your stay.'}
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
                ? 'Hotel services are temporarily unavailable.'
                : 'No hotel products published yet.'}{' '}
              <Link href="/contact" className="link-arrow">
                Enquire about hotels
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
