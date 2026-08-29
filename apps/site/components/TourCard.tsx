import Link from 'next/link';
import { formatPrice, priceOf, TourPublic } from '@/lib/api';

export default function TourCard({ tour }: { tour: TourPublic }) {
  const places = (tour.destinations ?? [])
    .map((d) => d.destination.name)
    .slice(0, 3)
    .join(' · ');
  const from = priceOf(tour);
  return (
    <Link href={`/tours/${tour.slug}`} className="card">
      {tour.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tour.coverImage} alt={tour.name} loading="lazy" />
      ) : (
        <div className="thumb">&#9968;</div>
      )}
      <div className="card-body">
        <div className="meta" style={{ marginBottom: 8 }}>
          <span className="chip">{tour.difficulty || 'Guided'}</span>
          <span>{tour.durationDays} days</span>
        </div>
        <h3>{tour.name}</h3>
        <p>{tour.summary}</p>
        <div className="meta">
          {places ? <span>{places}</span> : null}
          {from ? (
            <span className="price">from {formatPrice(from)}</span>
          ) : (
            <span className="chip">Enquire</span>
          )}
        </div>
      </div>
    </Link>
  );
}
