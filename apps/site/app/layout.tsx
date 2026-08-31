import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sunseekers Travel | Bespoke Tours & Journeys',
  description:
    'Explore curated tours across the world with Sunseekers Travel. Handcrafted itineraries, small groups, unforgettable journeys.',
};

const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

type NavItem = { label: string; href: string; cta?: boolean };

const DEFAULT_NAV: NavItem[] = [
  { label: 'Tours', href: '/tours' },
  { label: 'Ghana Tours', href: '/tours/ghana' },
  { label: 'International Tours', href: '/tours/international' },
  { label: 'Flights', href: '/flights' },
  { label: 'Hotels', href: '/hotels' },
  { label: 'Destinations', href: '/destinations' },
  { label: 'Contact', href: '/contact' },
  { label: 'Plan My Trip', href: '/contact', cta: true },
];

async function getNavMenus(): Promise<NavItem[]> {
  try {
    const res = await fetch(`${API_BASE}/public/settings`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_NAV;
    const json = (await res.json()) as { data?: Record<string, unknown> };
    const raw = json?.data?.nav_menus;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as NavItem[];
    }
    return DEFAULT_NAV;
  } catch {
    return DEFAULT_NAV;
  }
}

async function SiteHeader() {
  const nav = await getNavMenus();
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="sun">&#9728;</span> Sunseekers Travel
        </Link>
        <nav className="nav">
          {nav.map((item) => (
            <Link key={item.label} href={item.href} className={item.cta ? 'cta' : undefined}>
              {item.label}
            </Link>
          ))}
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
