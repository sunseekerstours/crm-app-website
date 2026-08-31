import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Logo & Slogan Column */}
          <div className="footer-col">
            <Logo variant="light" showTagline={true} />
            <p className="footer-desc">
              We specialize in putting together bespoke trips, immersive cultural experiences across all 16 regions of Ghana, and unforgettable international travel adventures.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/about">About Us</Link>
              </li>
              <li>
                <Link href="/tours/ghana">Tour Ghana</Link>
              </li>
              <li>
                <Link href="/tours/international">International Trips</Link>
              </li>
              <li>
                <Link href="/hotels">Hotel Reservation</Link>
              </li>
              <li>
                <Link href="/car-rentals">Vehicle Rental</Link>
              </li>
              <li>
                <Link href="/flights">Flights</Link>
              </li>
              <li>
                <Link href="/contact">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Popular Tours Column */}
          <div className="footer-col">
            <h4>Popular Tours</h4>
            <ul>
              <li>
                <Link href="/tours/december-in-ghana-12-days">December in Ghana</Link>
              </li>
              <li>
                <Link href="/tours/december-in-ghana-8-days">Afrofuture & Cultural Tour</Link>
              </li>
              <li>
                <Link href="/tours/chalewote-street-festival-2">Chale Wote Festival</Link>
              </li>
              <li>
                <Link href="/tours/the-ultimate-dubai-experience">Dubai Luxury Getaway</Link>
              </li>
              <li>
                <Link href="/tours/incredible-singapore">Incredible Singapore</Link>
              </li>
              <li>
                <Link href="/tours/desert-dream-getaway">Seychelles Tropical Escape</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info Column */}
          <div className="footer-col">
            <h4>Contact Info</h4>
            <div className="footer-contact-list">
              <div className="footer-contact-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                </svg>
                <span>+233 302 227 084<br />+233 244 311 267</span>
              </div>
              <div className="footer-contact-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                  <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                </svg>
                <span>info@sunseekerstours.com<br />sunseekerstours@yahoo.com</span>
              </div>
              <div className="footer-contact-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span>8 Farrar Avenue Opposite Trust Towers, Adabraka, Accra - Ghana</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>&copy; {new Date().getFullYear()} Sunseekers Tours. All rights reserved.</div>
          <div>Memories of our Tours are Forever</div>
        </div>
      </div>
    </footer>
  );
}
