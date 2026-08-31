import type { Metadata } from 'next';
import { apiGet, TourPublic } from '@/lib/api';
import TourDetailClient from '@/components/TourDetailClient';

export const revalidate = 60;
export const dynamicParams = true;

const FALLBACK_TOURS: Record<
  string,
  {
    name: string;
    summary: string;
    description: string;
    durationDays: number;
    destination: string;
    coverImage: string;
  }
> = {
  'december-in-ghana-12-days': {
    name: 'December in Ghana 12 Days',
    summary: 'Festivals, heritage castles, rainforest canopy walkway, and rich cultural immersion across Ghana.',
    description:
      'From 23rd Dec to 3rd Jan, step into Ghana with 12 days of culture, music, and celebration. Experience Accra’s lively nightlife, visit ancient castles in Cape Coast and Elmina, journey to the Ashanti kingdom in Kumasi, and join festive Afrofuture celebrations at Independence Square with live music and beach parties.',
    durationDays: 12,
    destination: 'Ghana',
    coverImage:
      'https://sunseekerstours.com/wp-content/uploads/2026/08/Photo-by-Afronation-com-1024x576-1.jpeg',
  },
  'december-in-ghana-8-days': {
    name: 'December in Ghana 8 Days',
    summary: 'Afrofuture festival, slave castles, canopy walkway, and cultural holiday celebration.',
    description:
      'An action-packed 8-day holiday celebration in Ghana combining the vibrant energy of the December festival season with visits to Kakum National Park and historic Cape Coast Castle.',
    durationDays: 8,
    destination: 'Ghana',
    coverImage:
      'https://sunseekerstours.com/wp-content/uploads/2026/08/afrofuture-festival-afrochella-fest_0UTNM.webp',
  },
  'chalewote-street-festival-2': {
    name: 'Chalewote Street Festival',
    summary: 'Alternative street art, music, graffiti, poetry, and coastal heritage in Old Accra.',
    description:
      'Immerse in the biggest public street art festival in West Africa. Explore the vibrant historic neighborhood of Jamestown, meet African artists, and experience live performances and craft workshops.',
    durationDays: 7,
    destination: 'Ghana',
    coverImage:
      'https://sunseekerstours.com/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-27-at-11.14.11-AM.jpeg',
  },
  'ghana-70-anniversary-2': {
    name: 'Ghana @ 70 Anniversary',
    summary: 'Celebrate 70 years of Ghana’s independence with historical milestones, cultural pageantry, and celebrations.',
    description:
      'Join the monumental Ghana Independence Anniversary tour. Visit Black Star Square, Kwame Nkrumah Mausoleum, and witness military parades, traditional durbars of chiefs, and national galas.',
    durationDays: 6,
    destination: 'Ghana',
    coverImage:
      'https://sunseekerstours.com/wp-content/uploads/2026/08/y17gwk3vvq_independence_day.jpg',
  },
  'incredible-singapore': {
    name: 'Incredible Singapore',
    summary: 'Futuristic Gardens by the Bay, Marina Bay Sands, Universal Studios, and shopping in Singapore.',
    description:
      'Experience the dazzling city-state of Singapore with 5 days of futuristic architecture, luxury rooftop views, Sentosa Island adventure, and world-class culinary wonders.',
    durationDays: 5,
    destination: 'Singapore',
    coverImage:
      'https://sunseekerstours.com/wp-content/uploads/2026/07/images-1-2.jpg',
  },
  'the-ultimate-dubai-experience': {
    name: 'The Ultimate Dubai Experience',
    summary: 'Desert safari dunes, Burj Khalifa, luxury dhow cruise, and gold souks in Dubai.',
    description:
      'A thrilling 5-day escape into the Arabian metropolis. Enjoy thrilling 4x4 desert dune bashing, VIP Burj Khalifa observation deck, luxury yacht marina cruise, and luxury shopping.',
    durationDays: 5,
    destination: 'Dubai',
    coverImage:
      'https://sunseekerstours.com/wp-content/uploads/2026/07/images.jpg',
  },
};

const RELATED_TOURS_LIST = [
  {
    title: 'Ghana @ 70 Anniversary',
    slug: 'ghana-70-anniversary-2',
    destination: 'Ghana',
    duration: '6 Days',
    image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/y17gwk3vvq_independence_day.jpg',
  },
  {
    title: 'Chalewote Street Festival',
    slug: 'chalewote-street-festival-2',
    destination: 'Ghana',
    duration: '7 Days',
    image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-27-at-11.14.11-AM.jpeg',
  },
  {
    title: 'Adventure & Trekking',
    slug: 'adventure-trekking',
    destination: 'Ghana',
    duration: '10 Days',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop',
  },
];

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const fallback = FALLBACK_TOURS[params.slug];
  try {
    const tour = await apiGet<TourPublic>(`/public/tours/${params.slug}`);
    return {
      title: `${tour.name} | Sunseekers Tours`,
      description: tour.summary,
    };
  } catch {
    return {
      title: `${fallback?.name || 'Tour Details'} | Sunseekers Tours`,
      description: fallback?.summary || 'Tour details and reservation with Sunseekers Tours.',
    };
  }
}

export default async function TourDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  let tour: TourPublic | null = null;
  try {
    tour = await apiGet<TourPublic>(`/public/tours/${params.slug}`);
  } catch {
    // fallback
  }

  if (!tour) {
    const fallback = FALLBACK_TOURS[params.slug] || {
      name: params.slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      summary: 'Experience an unforgettable journey with Sunseekers Tours.',
      description:
        'Discover authentic sights, local heritage, handpicked boutique stays, and seamless guided logistics tailored for your travel comfort.',
      durationDays: 7,
      destination: 'Ghana',
      coverImage:
        'https://sunseekerstours.com/wp-content/uploads/2026/08/Photo-by-Afronation-com-1024x576-1.jpeg',
    };

    tour = {
      id: params.slug,
      name: fallback.name,
      slug: params.slug,
      summary: fallback.summary,
      description: fallback.description,
      durationDays: fallback.durationDays,
      type: 'LEISURE',
      difficulty: 'MODERATE',
      minPax: 2,
      maxPax: 20,
      highlights: [
        'Experienced bilingual professional tour guides',
        'Air-conditioned private transportation',
        'All park & castle entrance permits',
        'Daily breakfast & select cultural banquets',
      ],
      coverImage: fallback.coverImage,
      currency: 'USD',
      basePrice: 3160,
      status: 'ACTIVE',
      destinations: [{ destination: { id: '1', name: fallback.destination, slug: fallback.destination.toLowerCase(), country: fallback.destination } }],
    };
  }

  const related = RELATED_TOURS_LIST.filter((r) => r.slug !== params.slug).slice(0, 3);

  return <TourDetailClient tour={tour} relatedTours={related} />;
}
