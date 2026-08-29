import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sunseekers Travel | Bespoke Tours & Journeys',
  description:
    'Explore curated tours across the world with Sunseekers Travel. Handcrafted itineraries, small groups, unforgettable journeys.',
};

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="sun">&#9728;</span> Sunseekers Travel
        </Link>
        <nav className="nav">
          <Link href="/tours">Tours</Link>
          <Link href="/destinations">Destinations</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/contact" className="cta">
            Plan My Trip
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <h4>Sunseekers Travel</h4>
          <p style={{ margin: 0, maxWidth: '40ch' }}>
            Bespoke tours and small-group journeys crafted with care. Your
            adventure starts here.
          </p>
        </div>
        <ul>
          <li>
            <Link href="/tours">Tours</Link>
          </li>
          <li>
            <Link href="/destinations">Destinations</Link>
          </li>
          <li>
            <Link href="/contact">Contact</Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
