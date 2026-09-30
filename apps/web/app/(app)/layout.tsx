'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Dashboard', exact: true },
  { href: '/customers', label: 'Customers' },
  { href: '/leads', label: 'Leads' },
  { href: '/deals', label: 'Deals' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/fleet', label: 'Fleet Management' },
  { href: '/invoices', label: 'Invoices & Quotes' },
  { href: '/payments', label: 'Payments' },
  { href: '/notifications', label: 'Notifications' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
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
      <aside className="sidebar">
        <div className="brand">Sunseekers CRM</div>
        <div className="nav-label">Workspace</div>
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`nav-link${active ? ' active' : ''}`}>
              {item.label}
            </Link>
          );
        })}
        <div className="nav-label">Account</div>
        <div style={{ padding: '4px 14px', fontSize: 13, color: '#7a9388', wordBreak: 'break-all' }}>
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
      <main className="main">{children}</main>
    </div>
  );
}
