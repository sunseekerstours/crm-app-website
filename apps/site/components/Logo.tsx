import Link from 'next/link';

export default function Logo({
  variant = 'dark',
  showTagline = false,
  className = '',
}: {
  variant?: 'dark' | 'light';
  showTagline?: boolean;
  className?: string;
}) {
  const textColor = variant === 'light' ? '#ffffff' : '#007A3D';
  const subtextColor = variant === 'light' ? '#a7f3d0' : '#f37023';

  return (
    <Link href="/" className={`inline-flex items-center gap-3 select-none ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
      {/* Sun + Palm Tree Icon */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Sun Rays */}
        <g fill="#FF8C00">
          <polygon points="50,2 55,16 45,16" />
          <polygon points="50,98 55,84 45,84" />
          <polygon points="2,50 16,55 16,45" />
          <polygon points="98,50 84,55 84,45" />
          <polygon points="16,16 28,25 21,32" />
          <polygon points="84,84 72,75 79,68" />
          <polygon points="16,84 25,72 32,79" />
          <polygon points="84,16 75,28 68,21" />
          <polygon points="32,6 40,19 30,19" />
          <polygon points="68,94 60,81 70,81" />
          <polygon points="6,68 19,60 19,70" />
          <polygon points="94,32 81,40 81,30" />
        </g>

        {/* Sun Body */}
        <circle cx="50" cy="50" r="32" fill="url(#sunGradient)" />

        {/* Sunglasses */}
        <path
          d="M26 44 C26 39 36 39 46 43 L48 43 C58 39 68 39 74 44 C76 52 70 57 58 57 C48 57 46 51 46 48 C46 51 44 57 34 57 C26 57 24 51 26 44 Z"
          fill="#111827"
        />
        {/* Sunglasses bridge */}
        <path d="M44 43 Q47 41 50 43" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
        {/* Sunglasses lens shine */}
        <path d="M30 44 Q35 44 38 48" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
        <path d="M54 44 Q59 44 64 48" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />

        {/* Smile */}
        <path
          d="M36 62 Q50 72 64 62"
          stroke="#9A3412"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M42 66 Q50 72 58 66"
          fill="#DC2626"
        />

        {/* Palm Tree 1 (Tall) */}
        <path
          d="M70 78 Q74 55 64 32 Q62 27 58 22"
          stroke="#15803D"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Palm Tree trunk segments */}
        <circle cx="68" cy="68" r="3" fill="#166534" />
        <circle cx="66" cy="56" r="3" fill="#166534" />
        <circle cx="63" cy="44" r="3" fill="#166534" />
        <circle cx="60" cy="33" r="2.5" fill="#166534" />

        {/* Palm Fronds / Leaves */}
        <path d="M58 22 Q42 16 36 24" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M58 22 Q50 8 46 6" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M58 22 Q68 10 74 12" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M58 22 Q78 18 84 28" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M58 22 Q68 28 72 38" stroke="#15803D" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M58 22 Q48 30 42 36" stroke="#166534" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Coconuts */}
        <circle cx="56" cy="25" r="2.5" fill="#78350F" />
        <circle cx="60" cy="26" r="2.5" fill="#78350F" />

        <defs>
          <radialGradient id="sunGradient" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="60%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </radialGradient>
        </defs>
      </svg>

      {/* Typography */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: '22px',
            fontWeight: '900',
            letterSpacing: '-0.5px',
            color: textColor,
            lineHeight: '1.1',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Sunseekers
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: '800',
            letterSpacing: '1px',
            color: textColor,
            lineHeight: '1.1',
            textTransform: 'uppercase',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Tours
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: '11px',
              fontStyle: 'italic',
              fontWeight: '500',
              color: subtextColor,
              marginTop: '2px',
            }}
          >
            ...Memories of our Tours are Forever
          </span>
        )}
      </div>
    </Link>
  );
}
