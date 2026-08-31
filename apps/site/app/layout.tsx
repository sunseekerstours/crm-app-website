import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Sunseekers Tours | Memories of our Tours are Forever',
  description:
    'Sunseekers Tours - Premier travel and tour agency in Ghana. We offer curated tours across Ghana, international trips, hotel reservations, car rentals, and flight bookings.',
  keywords: 'Ghana tours, travel Ghana, international tours, Sunseekers Tours, Accra tourism, West Africa tours, hotel reservation, car rental Ghana',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
