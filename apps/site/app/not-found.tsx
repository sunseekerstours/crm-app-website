import Link from 'next/link';

export const metadata = { title: 'Not found | Sunseekers Travel' };

export default function NotFound() {
  return (
    <section className="section">
      <div className="container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <div className="eyebrow">404</div>
        <h1 style={{ fontSize: '2.2rem', margin: '12px 0' }}>
          This journey doesn&apos;t exist
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: '46ch', margin: '0 auto 24px' }}>
          The page or tour you’re looking for isn’t here. Let’s get you back on
          track.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
