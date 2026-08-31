import HomeClient from '@/components/HomeClient';

export const revalidate = 60;

export default function HomePage() {
  const TRENDING_TOURS = [
    {
      title: 'December in Ghana 12 Days',
      slug: 'december-in-ghana-12-days',
      destination: 'Ghana',
      duration: '12 Days - 11 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/Photo-by-Afronation-com-1024x576-1.jpeg',
    },
    {
      title: 'December in Ghana 8 Days',
      slug: 'december-in-ghana-8-days',
      destination: 'Ghana',
      duration: '8 Days - 7 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/afrofuture-festival-afrochella-fest_0UTNM.webp',
    },
    {
      title: 'Chalewote Street Festival',
      slug: 'chalewote-street-festival-2',
      destination: 'Ghana',
      duration: '7 Days - 6 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/WhatsApp-Image-2026-08-27-at-11.14.11-AM.jpeg',
    },
    {
      title: 'Ghana @ 70 Anniversary',
      slug: 'ghana-70-anniversary-2',
      destination: 'Ghana',
      duration: '6 Days - 5 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/08/y17gwk3vvq_independence_day.jpg',
    },
    {
      title: 'Explore Singapore & Malaysia',
      slug: 'explore-singapore-malaysia',
      destination: 'Singapore',
      duration: '8 Days - 7 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/Universal-Studios-Singapore.jpg',
    },
    {
      title: 'Incredible Singapore',
      slug: 'incredible-singapore',
      destination: 'Singapore',
      duration: '6 Days - 5 Nights',
      image: 'https://sunseekerstours.com/wp-content/uploads/2026/07/images-1-2.jpg',
    },
  ];

  const SERVICES = [
    {
      title: 'Tour Ghana',
      desc: 'Heritage, cultural celebrations, historical castles, and scenic safaris across all 16 regions of Ghana.',
      emoji: '🏛️',
      href: '/tours/ghana',
    },
    {
      title: 'International Trips',
      desc: 'World adventure tours to Dubai, Singapore, Rwanda, Seychelles, Malaysia, and exotic global destinations.',
      emoji: '✈️',
      href: '/tours/international',
    },
    {
      title: 'Hotel Reservation',
      desc: 'Hand-picked luxury resorts, boutique villas, and business hotels worldwide with exclusive rates.',
      emoji: '🏨',
      href: '/hotels',
    },
    {
      title: 'Vehicle Rental & Flights',
      desc: 'Comprehensive transportation with chauffeur-driven 4x4s, tourist coaches, and global flight ticketing.',
      emoji: '🚗',
      href: '/car-rentals',
    },
  ];

  return <HomeClient trendingTours={TRENDING_TOURS} services={SERVICES} />;
}
