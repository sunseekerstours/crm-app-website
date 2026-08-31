'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Dashboard', exact: true },
  { href: '/content/pages', label: 'Site Pages' },
  { href: '/settings', label: 'Site Settings' },
  { href: '/users', label: 'Users & Roles' },
  { href: '/audit', label: 'Audit Log' },
];

const CRM_NAV = [
  { href: '/crm/tours', label: 'Tours & Trips' },
  { href: '/crm/customers', label: 'Customers' },
  { href: '/crm/leads', label: 'Leads' },
  { href: '/crm/deals', label: 'Deals' },
  { href: '/crm/departures', label: 'Departures' },
  { href: '/crm/bookings', label: 'Bookings' },
  { href: '/crm/payments', label: 'Payments' },
  { href: '/crm/operations', label: 'Trip Board' },
  { href: '/crm/notifications', label: 'Notifications' },
];

const HR_NAV = [
  { href: '/hr/employees', label: 'Staff' },
  { href: '/hr/performance', label: 'Performance' },
  { href: '/hr/leave', label: 'Leave' },
];

function NavLink({ item, pathname }: { item: { href: string; label: string; exact?: boolean }; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link key={item.href} href={item.href} className={`nav-link${active ? ' active' : ''}`}>
      {item.label}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, logout } = useAuth();
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
        <div className="brand">Sunseekers One</div>
        {!isAdmin ? (
          <div style={{ fontSize: 13, color: '#f0b429', padding: '0 10px 4px' }}>
            Limited access - not SUPER_ADMIN/ADMIN
          </div>
        ) : null}
        <div className="nav-label">CRM</div>
        {CRM_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="nav-label">HR</div>
        {HR_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="nav-label">Website & Admin</div>
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="nav-label">Account</div>
        <span className="nav-link" style={{ fontSize: 13, color: '#7a9388' }}>
          {user.email}
        </span>
        <button className="btn btn-ghost" style={{ marginTop: 8, color: '#d9e6df' }} onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
