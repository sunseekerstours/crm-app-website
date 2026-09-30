import Link from 'next/link';

export default function Logo({
  collapsed = false,
  className = '',
  height = 42,
}: {
  collapsed?: boolean;
  className?: string;
  height?: number;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 select-none ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: collapsed ? '0' : '10px',
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
          filter: 'drop-shadow(0 2px 8px rgba(22, 163, 74, 0.25))',
        }}
      />
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '17px',
              fontWeight: '900',
              color: '#ffffff',
              letterSpacing: '-0.3px',
              lineHeight: 1.1,
            }}
          >
            Sunseekers
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: '800',
              color: '#22c55e',
              letterSpacing: '0.8px',
              lineHeight: 1.1,
              textTransform: 'uppercase',
            }}
          >
            Tours CRM
          </span>
          <span
            style={{
              fontSize: '9px',
              fontStyle: 'italic',
              color: '#f97316',
              marginTop: '1px',
            }}
          >
            ...Memories Forever
          </span>
        </div>
      )}
    </Link>
  );
}
