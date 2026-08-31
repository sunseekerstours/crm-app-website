import Link from 'next/link';
import { TourPublic } from '@/lib/api';

export default function TourCard({ tour }: { tour: TourPublic }) {
  const destinationName =
    tour.destinations && tour.destinations.length > 0
      ? tour.destinations[0].destination.name
      : 'Ghana';

  return (
    <div className="tour-card">
      <div className="tour-card-img-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            tour.coverImage ||
            'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=800&auto=format&fit=crop'
          }
          alt={tour.name}
          loading="lazy"
        />
        <div className="tour-card-badge">{destinationName}</div>
        <button className="tour-card-heart" title="Save to Favorites" aria-label="Favorite">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            style={{ width: 18, height: 18 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      </div>

      <div className="tour-card-body">
        <div className="tour-card-dest">
          <span>📍 {destinationName}</span>
        </div>
        <h3 className="tour-card-title">{tour.name}</h3>

        <div className="tour-card-meta">
          <div className="tour-card-duration">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              style={{ width: 15, height: 15 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{tour.durationDays} Days</span>
          </div>
          <span className="tour-card-price">Best Value</span>
        </div>

        <Link href={`/tours/${tour.slug}`} className="btn-view-details">
          View Details
        </Link>
      </div>
    </div>
  );
}
