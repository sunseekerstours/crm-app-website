'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import Logo from '@/components/Logo';
import { useNotifications } from '@/lib/notifications-context';

const NAV = [
  { href: '/', label: 'Dashboard', exact: true, icon: '📊' },
  { href: '/customers', label: 'Customers', icon: '👥' },
  { href: '/leads', label: 'Leads', icon: '🎯' },
  { href: '/deals', label: 'Sales Stages (Deals)', icon: '💼' },
  { href: '/bookings', label: 'Bookings', icon: '✈️' },
  { href: '/tours', label: 'Customised Tours & Ops', icon: '🗺️' },
  { href: '/fleet', label: 'Fleet Management', icon: '🚌' },
  { href: '/qr-codes', label: 'QR Code Studio', icon: '📱' },
  { href: '/invoices', label: 'Invoices & Quotes', icon: '🧾' },
  { href: '/payments', label: 'Payments', icon: '💳' },
  { href: '/notifications', label: 'Notifications', icon: '🔔', isNotification: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { unreadCount, triggerSoundTest } = useNotifications();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return <div className="auth-wrap">Loading…</div>;
  }

  return (
    <div className="shell">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`sidebar${mobileSidebarOpen ? ' mobile-open' : ''}`}
        style={{ background: '#0a1612', borderRight: '1px solid rgba(22, 163, 74, 0.2)' }}
      >
        {/* Brand Header with Mobile Close button */}
        <div
          style={{
            padding: '16px 14px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Logo height={40} />
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close menu"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#d1fae5',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
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
                background: active
                  ? 'linear-gradient(90deg, rgba(22, 163, 74, 0.3) 0%, rgba(22, 163, 74, 0.1) 100%)'
                  : 'transparent',
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

      {/* Main Content Pane with Mobile Topbar */}
      <div className="content-pane" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile Top Navbar (Visible on screens ≤ 768px) */}
        <header className="mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="mobile-hamburger-btn"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '8px',
                color: '#fff',
                padding: '7px 9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                lineHeight: 1,
              }}
            >
              ☰
            </button>
            <Logo height={28} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/notifications"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#fff',
                fontSize: '14px',
                textDecoration: 'none',
              }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 800,
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>

            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#cbd5e1',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="main" style={{ background: '#f8fafc', minHeight: '100vh', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
