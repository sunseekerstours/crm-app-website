export type DestinationSummary = {
  id: string;
  name: string;
  slug: string;
  country: string;
  region?: string | null;
};

export type TourDestination = { destination: DestinationSummary };

export type DeparturePublic = {
  id: string;
  startDate: string;
  endDate: string;
  price: number | null;
  currency: string;
  bookedCount: number;
  maxPax: number | null;
  remaining: number | null;
};

export type ListDeparturePublic = DeparturePublic;

export type DetailDeparturePublic = DeparturePublic & {
  available: boolean;
};

export type DestinationPublic = DestinationSummary & {
  summary?: string | null;
  coverImage?: string | null;
  _count?: { tours?: number };
};

export type TourPublic = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  durationDays: number;
  type: string;
  difficulty: string;
  minPax: number;
  maxPax: number | null;
  highlights: string[];
  coverImage: string | null;
  images?: string[];
  videoUrl?: string | null;
  currency: string;
  basePrice: number | null;
  status: string;
  destinations?: TourDestination[];
  futureDepartures?: ListDeparturePublic[];
  departures?: DetailDeparturePublic[];
};

export type ProductPublic = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price: number | null;
  currency: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: { requestId?: string };
  error?: unknown;
};

const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export class PublicApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PublicApiError';
  }
}

export async function apiGet<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: 'application/json' },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new PublicApiError(res.status, `${path} -> HTTP ${res.status}`);
  }
  const json = (await res.json()) as ApiEnvelope<T>;
  return json?.data;
}

export function priceOf(
  tour: Pick<TourPublic, 'basePrice' | 'currency'>,
): { price: number; currency: string } | null {
  if (tour.basePrice == null) return null;
  return { price: tour.basePrice, currency: tour.currency };
}

export function formatPrice(p: { price: number; currency: string }): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: p.currency,
      maximumFractionDigits: 0,
    }).format(p.price);
  } catch {
    return `${p.price} ${p.currency}`;
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRange(start: string, end: string): string {
  const a = new Date(start);
  const b = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return `${a.toLocaleDateString('en-US', opts)} – ${b.toLocaleDateString('en-US', opts)}`;
}
