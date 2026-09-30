'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Logo from '@/components/Logo';
import { useNotifications } from '@/lib/notifications-context';

const NAV = [
  { href: '/', label: 'Dashboard', exact: true, icon: '📊' },
  { href: '/customers', label: 'Customers', icon: '👥' },
  { href: '/leads', label: 'Leads', icon: '🎯' },
  { href: '/deals', label: 'Deals', icon: '💼' },
  { href: '/bookings', label: 'Bookings', icon: '✈️' },
  { href: '/fleet', label: 'Fleet Management', icon: '🚌' },
  { href: '/invoices', label: 'Invoices & Quotes', icon: '🧾' },
  { href: '/payments', label: 'Payments', icon: '💳' },
  { href: '/notifications', label: 'Notifications', icon: '🔔', isNotification: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { unreadCount, triggerSoundTest } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="auth-wrap">Loading…</div>;
  }

  return (
    <div className="shell">
      <aside className="sidebar" style={{ background: '#0a1612', borderRight: '1px solid rgba(22, 163, 74, 0.2)' }}>
        {/* Official Brand Header */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo height={44} />
        </div>

        <div className="nav-label" style={{ color: '#86efac', fontWeight: 700, letterSpacing: '0.08em' }}>
          Workspace
        </div>

        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${active ? ' active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 14px',
                borderRadius: '8px',
                margin: '2px 8px',
                transition: 'all 0.2s ease',
                color: active ? '#ffffff' : '#cbd5e1',
                background: active ? 'linear-gradient(90deg, rgba(22, 163, 74, 0.3) 0%, rgba(22, 163, 74, 0.1) 100%)' : 'transparent',
                borderLeft: active ? '3px solid #22c55e' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                <span style={{ fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </div>

              {/* Real-time Notifications Counter Badge */}
              {item.isNotification && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 6px',
                    borderRadius: '11px',
                    fontSize: '11px',
                    fontWeight: 800,
                    background: unreadCount > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    boxShadow: unreadCount > 0 ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                  title={`${unreadCount} unread notifications`}
                >
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="nav-label" style={{ color: '#86efac', fontWeight: 700, letterSpacing: '0.08em', marginTop: '16px' }}>
          Alerts &amp; Audio
        </div>
        
        <button
          onClick={triggerSoundTest}
          style={{
            margin: '4px 12px 12px',
            background: 'rgba(249, 115, 22, 0.12)',
            border: '1px solid rgba(249, 115, 22, 0.35)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#fdba74',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s',
          }}
          title="Play chime sound test"
        >
          <span>🔊</span> Test Chime Sound
        </button>

        <div className="nav-label" style={{ color: '#86efac', fontWeight: 700, letterSpacing: '0.08em' }}>
          Account
        </div>
        <div style={{ padding: '4px 14px', fontSize: 13, color: '#94a3b8', wordBreak: 'break-all' }}>
          {user.email}
        </div>
        <button
          onClick={logout}
          style={{
            margin: '8px 14px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '6px 12px',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: 12,
            textAlign: 'left',
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main" style={{ background: '#070f0c' }}>{children}</main>
    </div>
  );
}
