'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Dashboard', exact: true, permission: '' },
  { href: '/content/pages', label: 'Site Pages', permission: 'pages.view' },
  { href: '/settings', label: 'Site Settings', permission: 'settings.view' },
  { href: '/users', label: 'Users & Roles', permission: 'users.view' },
  { href: '/audit', label: 'Audit Log', permission: 'audit.view' },
];

const CRM_NAV = [
  { href: '/crm/tours', label: 'Tours & Trips', permission: 'tours.view' },
  { href: '/crm/destinations', label: 'Destinations', permission: 'destinations.view' },
  { href: '/crm/products', label: 'Products & Services', permission: 'products.view' },
  { href: '/crm/customers', label: 'Customers', permission: 'customers.view' },
  { href: '/crm/leads', label: 'Leads', permission: 'leads.view' },
  { href: '/crm/deals', label: 'Deals', permission: 'deals.view' },
  { href: '/crm/departures', label: 'Departures', permission: 'departures.view' },
  { href: '/crm/bookings', label: 'Bookings', permission: 'bookings.view' },
  { href: '/crm/payments', label: 'Payments', permission: 'payments.view' },
  { href: '/crm/operations', label: 'Trip Board', permission: 'operations.view' },
  { href: '/crm/notifications', label: 'Notifications', permission: 'notifications.view' },
];

const HR_NAV = [
  { href: '/hr/employees', label: 'Staff', permission: 'staff.view' },
  { href: '/hr/performance', label: 'Performance', permission: 'staff.view' },
  { href: '/hr/leave', label: 'Leave', permission: 'staff.view' },
];

function hasUserPermission(user: { permissions?: string[] } | null | undefined, permission: string): boolean {
  if (!permission) return true;
  if (!user) return false;
  if (!Array.isArray(user.permissions) || user.permissions.length === 0) return true;
  return user.permissions.includes(permission);
}

// Helper to return high-quality modern SVG icons for navigation links
function getIcon(label: string) {
  switch (label) {
    case 'Dashboard':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z" />
        </svg>
      );
    case 'Site Pages':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'Site Settings':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'Users & Roles':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.213 0-4.302-.63-6.085-1.73v-.109m12-3.972a4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.213 0-4.302-.63-6.085-1.73v-.109m12-3.972a4.125 4.125 0 00-7.533-2.493m0 0a4.012 4.012 0 014.012-4.012c2.216 0 4.012 1.796 4.012 4.012m-8.024 0a4.012 4.012 0 00-4.012 4.012" />
        </svg>
      );
    case 'Audit Log':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-1.5 3h1.5m-7.5-3h.008v.008H3.75V10.5zm0 3h.008v.008H3.75v-.008zm0-6h.008v.008H3.75V7.5zM6 7.5h-.008v.008H6V7.5zM6 10.5h-.008v.008H6v-.008zm0 3h-.008v.008H6v-.008zM1.5 5.25c0-.621.504-1.125 1.125-1.125h16.25c.621 0 1.125.504 1.125 1.125v13.5c0 .621-.504 1.125-1.125 1.125H2.625A1.125 1.125 0 011.5 18.75V5.25z" />
        </svg>
      );
    case 'Tours & Trips':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.89-2.445c.385-.193.607-.586.607-1.018V3.923c0-.93-.91-1.583-1.815-1.378l-4.577 1.04a1.875 1.875 0 01-1.095 0L8.72 2.545a1.875 1.875 0 00-1.094 0L2.735 3.585C1.83 3.79 1 4.443 1 5.373v11.838c0 .432.222.825.607 1.018l4.89 2.445a1.875 1.875 0 001.503 0l4.89-2.445a1.875 1.875 0 011.503 0z" />
        </svg>
      );
    case 'Destinations':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      );
    case 'Products & Services':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
    case 'Customers':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.213 0-4.302-.63-6.085-1.73v-.109m12-3.972a4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.213 0-4.302-.63-6.085-1.73v-.109m12-3.972a4.125 4.125 0 00-7.533-2.493" />
        </svg>
      );
    case 'Leads':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.231 0-4.334-.6-6.124-1.656z" />
        </svg>
      );
    case 'Deals':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-1.958-.59a2.502 2.502 0 010-3.953c1.047-.78 2.868-.78 3.916 0L15 8.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'Departures':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      );
    case 'Bookings':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.3 0A48.536 48.536 0 013 6.108V16.5A2.25 2.25 0 005.25 18.75h1.5m.75-16.5h1.5" />
        </svg>
      );
    case 'Payments':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      );
    case 'Trip Board':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'Notifications':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      );
    case 'Staff':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.213 0-4.302-.63-6.085-1.73v-.109m12-3.972a4.125 4.125 0 00-7.533-2.493" />
        </svg>
      );
    case 'Performance':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18v-1.5c0-1.03.83-1.875 1.875-1.875H5.25M2.25 18v.11a12.319 12.319 0 003.228.14m-3.228-.25a12.308 12.308 0 013.228-.25m0 0H18.75m-15 0a12.28 12.28 0 013.228.25m0 0V9.75M9 9.75a3 3 0 116 0M9 9.75a3 3 0 006 0" />
        </svg>
      );
    case 'Leave':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      );
  }
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: { href: string; label: string; exact?: boolean };
  pathname: string;
  onClick?: () => void;
}) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      key={item.href}
      href={item.href}
      className={`nav-link${active ? ' active' : ''}`}
      onClick={onClick}
    >
      {getIcon(item.label)}
      <span className="sidebar-text">{item.label}</span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Sidebar expand/collapse states (desktop)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Collapsible navigation groups
  const [crmOpen, setCrmOpen] = useState(true);
  const [hrOpen, setHrOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  // Mobile sidebar open
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Automatically close mobile sidebar on navigation path changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return <div className="auth-wrap">Loading…</div>;
  }

  // Simple breadcrumbs builder
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbItems = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const cleanLabel = seg.charAt(0).toUpperCase() + seg.slice(1);
    return { href, label: cleanLabel.replace(/-/g, ' ') };
  });

  const userInitials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="shell">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar Panel */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="brand-wrap">
          <div className="brand">Sunseekers One</div>
          
          {/* Desktop Collapse Button */}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ display: 'flex' }}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {sidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            )}
          </button>
        </div>

        {!isAdmin ? (
          <div style={{ fontSize: 11, color: '#f0b429', padding: '0 10px 10px', fontWeight: 600 }}>
            Limited access - not ADMIN
          </div>
        ) : null}

        <div className="sidebar-nav-scroll">
        {/* CRM Navigation Section */}
        <div className="nav-group">
          <div className="nav-label-wrap" onClick={() => setCrmOpen(!crmOpen)}>
            <span className="nav-label">CRM</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ transform: crmOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          {crmOpen && CRM_NAV.filter((item) => hasUserPermission(user, item.permission)).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {/* HR Navigation Section */}
        <div className="nav-group">
          <div className="nav-label-wrap" onClick={() => setHrOpen(!hrOpen)}>
            <span className="nav-label">HR</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ transform: hrOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          {hrOpen && HR_NAV.filter((item) => hasUserPermission(user, item.permission)).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {/* Website & Admin Navigation Section */}
        <div className="nav-group">
          <div className="nav-label-wrap" onClick={() => setAdminOpen(!adminOpen)}>
            <span className="nav-label">Website & Admin</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ transform: adminOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          {adminOpen && NAV.filter((item) => hasUserPermission(user, item.permission)).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        </div>

        {/* User Account / Profile Widget */}
        <div className="sidebar-profile">
          <div className="profile-card">
            <div className="profile-avatar">{userInitials}</div>
            <div className="profile-info">
              <div className="profile-email" title={user.email}>{user.email}</div>
              <div className="profile-role">{user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'SUPER_ADMIN'}</div>
            </div>
          </div>
          <button className="profile-logout-btn" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="content-wrapper">
        {/* Top Sticky Navbar */}
        <header className="top-navbar">
          <div className="navbar-left">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button className="mobile-toggle" onClick={() => setMobileSidebarOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 24, height: 24 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Breadcrumbs Navigation */}
            <nav className="breadcrumbs">
              <Link href="/">Console</Link>
              {breadcrumbItems.map((item, idx) => (
                <span key={item.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="breadcrumbs-separator">/</span>
                  {idx === breadcrumbItems.length - 1 ? (
                    <span className="breadcrumbs-current">{item.label}</span>
                  ) : (
                    <Link href={item.href}>{item.label}</Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="navbar-right">
            {/* Global Search Bar (Visual Placeholder) */}
            <div className="nav-search-bar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#64748b" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
              <input type="text" placeholder="Search Console..." disabled />
            </div>

            {/* Notification Icon (Visual Link to CRM Notifications) */}
            <Link href="/crm/notifications" className="nav-badge-icon" title="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="nav-badge-dot" />
            </Link>
          </div>
        </header>

        {/* Central Page Main Area */}
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
