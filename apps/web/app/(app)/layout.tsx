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
  { href: '/tours', label: 'Tours' },
  { href: '/departures', label: 'Departures' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/payments', label: 'Payments' },
  { href: '/operations', label: 'Trip Board' },
  { href: '/notifications', label: 'Notifications' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
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
        <span className="nav-link" style={{ fontSize: 13, color: '#7a9388' }}>
          {user.email}
        </span>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
