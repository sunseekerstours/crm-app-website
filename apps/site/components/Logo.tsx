import Link from 'next/link';

export default function Logo({
  variant = 'dark',
  showTagline = true,
  className = '',
  height = 50,
}: {
  variant?: 'dark' | 'light';
  showTagline?: boolean;
  className?: string;
  height?: number;
}) {
  const textColor = variant === 'light' ? '#ffffff' : '#007A3D';
  const subtextColor = variant === 'light' ? '#f97316' : '#ea580c';

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 select-none ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        textDecoration: 'none',
      }}
    >
      <img
        src="/logo.png"
        alt="Sunseekers Tours"
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 8px rgba(0, 122, 61, 0.25))',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: '20px',
            fontWeight: '900',
            letterSpacing: '-0.3px',
            color: textColor,
            lineHeight: '1.1',
          }}
        >
          Sunseekers
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: '800',
            letterSpacing: '1px',
            color: '#16a34a',
            lineHeight: '1.1',
            textTransform: 'uppercase',
          }}
        >
          Tours Ghana
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: '10px',
              fontStyle: 'italic',
              color: subtextColor,
              marginTop: '1px',
              fontWeight: 600,
            }}
          >
            ...Memories Forever
          </span>
        )}
      </div>
    </Link>
  );
}
