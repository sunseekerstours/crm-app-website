'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toursDropdownOpen, setToursDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = pathname === '/';

  return (
    <header className={`header-wrapper ${isScrolled ? 'is-scrolled' : ''}`}>
      {/* 1. Top Utility Contact Bar (Screenshot 1) */}
      <div className="top-utility-bar">
        <div className="utility-container">
          <div className="utility-left">
            <a href="tel:+233244311267" className="utility-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
              <span>+233 302 227 084 / +233 244 311 267</span>
            </a>
            <span className="utility-divider">•</span>
            <div className="utility-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>Accra / Ghana</span>
            </div>
          </div>

          <div className="utility-right">
            <span className="utility-tagline">Feel life&apos;s beauty &bull; Memories of our Tours are Forever</span>
          </div>
        </div>
      </div>

      {/* 2. Floating Island / Pill Navbar (Screenshot 1 & 2) */}
      <div className="floating-navbar-container">
        <nav className="floating-island-navbar">
          {/* Logo */}
          <div className="nav-logo-wrap">
            <Logo variant="dark" />
          </div>

          {/* Nav Links Center */}
          <div className="nav-links-center">
            {/* Home */}
            <Link
              href="/"
              className={`nav-link-item ${pathname === '/' ? 'active' : ''}`}
            >
              <span>Home</span>
              {pathname === '/' && <span className="active-orange-bar" />}
            </Link>

            {/* Tours with dropdown */}
            <div
              className="nav-item-dropdown"
              onMouseEnter={() => setToursDropdownOpen(true)}
              onMouseLeave={() => setToursDropdownOpen(false)}
            >
              <Link
                href="/tours"
                className={`nav-link-item ${pathname.startsWith('/tours') ? 'active' : ''}`}
              >
                <span>Tours</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ width: 14, height: 14, marginTop: 1, opacity: 0.7 }}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
                {pathname.startsWith('/tours') && <span className="active-orange-bar" />}
              </Link>

              {toursDropdownOpen && (
                <div className="dropdown-menu-card">
                  <Link href="/tours" className="dropdown-link">
                    <span className="dropdown-icon">🌍</span>
                    <div>
                      <div className="dropdown-title">All Tours &amp; Trips</div>
                      <div className="dropdown-desc">Explore our full curated catalogue</div>
                    </div>
                  </Link>
                  <Link href="/tours/ghana" className="dropdown-link">
                    <span className="dropdown-icon">🇬🇭</span>
                    <div>
                      <div className="dropdown-title">Tour Ghana</div>
                      <div className="dropdown-desc">Culture, Heritage, Castles &amp; Safaris</div>
                    </div>
                  </Link>
                  <Link href="/tours/international" className="dropdown-link">
                    <span className="dropdown-icon">✈️</span>
                    <div>
                      <div className="dropdown-title">International Tours</div>
                      <div className="dropdown-desc">Dubai, Zanzibar, South Africa, Europe</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Destinations */}
            <Link
              href="/destinations"
              className={`nav-link-item ${pathname.startsWith('/destinations') ? 'active' : ''}`}
            >
              <span>Destinations</span>
              {pathname.startsWith('/destinations') && <span className="active-orange-bar" />}
            </Link>

            {/* Hotels */}
            <Link
              href="/hotels"
              className={`nav-link-item ${pathname === '/hotels' ? 'active' : ''}`}
            >
              <span>Hotels</span>
              {pathname === '/hotels' && <span className="active-orange-bar" />}
            </Link>

            {/* Flights */}
            <Link
              href="/flights"
              className={`nav-link-item ${pathname === '/flights' ? 'active' : ''}`}
            >
              <span>Flights</span>
              {pathname === '/flights' && <span className="active-orange-bar" />}
            </Link>

            {/* Car Rentals */}
            <Link
              href="/car-rentals"
              className={`nav-link-item ${pathname === '/car-rentals' ? 'active' : ''}`}
            >
              <span>Car Rentals</span>
              {pathname === '/car-rentals' && <span className="active-orange-bar" />}
            </Link>

            {/* Plan Your Trip */}
            <Link
              href="/plan-your-trip"
              className={`nav-link-item ${pathname === '/plan-your-trip' ? 'active' : ''}`}
            >
              <span>Plan your trip</span>
              {pathname === '/plan-your-trip' && <span className="active-orange-bar" />}
            </Link>
          </div>

          {/* CTA Button Pill (Screenshot 1 & 2) */}
          <div className="nav-right-actions">
            <Link href="/plan-your-trip" className="pill-book-btn">
              <span>Book Now</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 26, height: 26 }}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-links">
            <Link href="/" className={pathname === '/' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link href="/tours" className={pathname.startsWith('/tours') ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              All Tours &amp; Trips
            </Link>
            <Link href="/tours/ghana" className={pathname === '/tours/ghana' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              🇬🇭 Tour Ghana
            </Link>
            <Link href="/tours/international" className={pathname === '/tours/international' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              ✈️ International Tours
            </Link>
            <Link href="/destinations" className={pathname.startsWith('/destinations') ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              Destinations
            </Link>
            <Link href="/hotels" className={pathname === '/hotels' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              Hotels
            </Link>
            <Link href="/flights" className={pathname === '/flights' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              Flights
            </Link>
            <Link href="/car-rentals" className={pathname === '/car-rentals' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              Car Rentals
            </Link>
            <Link href="/plan-your-trip" className={pathname === '/plan-your-trip' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              Plan your trip
            </Link>
            <Link href="/about" className={pathname === '/about' ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              About Us
            </Link>
            <Link href="/plan-your-trip" className="mobile-cta-btn" onClick={() => setMobileMenuOpen(false)}>
              Book Now &rarr;
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
