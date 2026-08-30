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
  accent?: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [users, pages, settings, tours, bookings, customers] = await Promise.all([
          api.get<{ total: number }>('/users?limit=1'),
          api.get<{ total: number }>('/pages?limit=1'),
          api.get<unknown[]>('/site-settings'),
          api.get<{ total: number }>('/tours?limit=1'),
          api.get<{ total: number }>('/bookings?limit=1'),
          api.get<{ total: number }>('/customers?limit=1'),
        ]);
        if (!active) return;
        setStats([
          { label: 'Users', value: String(users.total), href: '/users' },
          { label: 'Site Pages', value: String(pages.total), href: '/content/pages' },
          { label: 'Site Settings', value: String(Array.isArray(settings) ? settings.length : 0), href: '/settings' },
          { label: 'Tours', value: String(tours.total), href: '/crm/tours' },
          { label: 'Bookings', value: String(bookings.total), href: '/crm/bookings' },
          { label: 'Customers', value: String(customers.total), href: '/crm/customers' },
        ]);
      } catch {
        /* some endpoints may be unavailable for this role */
        if (active) setStats([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader title="Super Admin Console" subtitle={`Signed in as ${user?.email ?? 'admin'}`} />
      {loading ? (
        <Spinner />
      ) : (
        <div className="stats-grid">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </Link>
          ))}
        </div>
      )}
      {!loading && stats.length === 0 ? (
        <Card title="Some data unavailable">
          <p>
            Some CRM endpoints may require additional permissions. Users with the SUPER_ADMIN role have full access to
            all modules.
          </p>
        </Card>
      ) : null}
      <Card title="Quick actions">
        <div className="quick-actions">
          <Link className="btn btn-primary" href="/users">
            Add a user
          </Link>
          <Link className="btn btn-secondary" href="/content/pages/new">
            New site page
          </Link>
          <Link className="btn btn-secondary" href="/settings">
            Edit site settings
          </Link>
        </div>
      </Card>
    </>
  );
}
