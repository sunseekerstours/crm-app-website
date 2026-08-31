'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

interface StatCard {
  label: string;
  value: string;
  href: string;
  icon: string;
  color: string;
  permission?: string;
}

function hasPerm(user: { permissions?: string[] } | null | undefined, perm: string | undefined): boolean {
  if (!perm) return true;
  if (!user) return false;
  if (!Array.isArray(user.permissions) || user.permissions.length === 0) return true;
  return user.permissions.includes(perm);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const results = await Promise.all([
          api.get<{ total: number }>('/customers?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/leads?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/deals?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/tours?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/departures?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/bookings?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/payments?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/users?limit=1').catch(() => ({ total: 0 })),
        ]);
        if (!active) return;
        setStats([
          { label: 'Customers', value: String(results[0].total), href: '/crm/customers', icon: '👥', color: '#0E9F6E', permission: 'customers.view' },
          { label: 'Leads', value: String(results[1].total), href: '/crm/leads', icon: '🎯', color: '#F59E0B', permission: 'leads.view' },
          { label: 'Deals', value: String(results[2].total), href: '/crm/deals', icon: '💼', color: '#2563EB', permission: 'deals.view' },
          { label: 'Tours', value: String(results[3].total), href: '/crm/tours', icon: '🏝️', color: '#7C3AED', permission: 'tours.view' },
          { label: 'Departures', value: String(results[4].total), href: '/crm/departures', icon: '✈️', color: '#0891B2', permission: 'departures.view' },
          { label: 'Bookings', value: String(results[5].total), href: '/crm/bookings', icon: '🧾', color: '#059669', permission: 'bookings.view' },
          { label: 'Payments', value: String(results[6].total), href: '/crm/payments', icon: '💳', color: '#D97706', permission: 'payments.view' },
          { label: 'Users', value: String(results[7].total), href: '/users', icon: '👤', color: '#6366F1', permission: 'users.view' },
        ]);
      } catch {
        if (active) setStats([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const visibleStats = stats.filter((s) => hasPerm(user, s.permission));
  const role = user?.roles?.join(', ') || 'SUPER_ADMIN';

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${user?.email ?? 'admin'} · ${role}`} />
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="stats-grid">
            {visibleStats.map((s) => (
              <Link key={s.label} href={s.href} className="stat-card" style={{ borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </Link>
            ))}
          </div>
          {!loading && visibleStats.length === 0 && (
            <Card title="Limited Access">
              <p>Some CRM modules require additional permissions. Contact your administrator to request access.</p>
            </Card>
          )}
          <Card title="Quick Actions">
            <div className="quick-actions">
              {hasPerm(user, 'users.create') && (
                <Link className="btn btn-primary" href="/users">Add User</Link>
              )}
              {hasPerm(user, 'customers.create') && (
                <Link className="btn btn-secondary" href="/crm/customers">Add Customer</Link>
              )}
              {hasPerm(user, 'leads.create') && (
                <Link className="btn btn-secondary" href="/crm/leads">Add Lead</Link>
              )}
              {hasPerm(user, 'tours.create') && (
                <Link className="btn btn-secondary" href="/crm/tours">Add Tour</Link>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
