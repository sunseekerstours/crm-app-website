'use client';

import Link from 'next/link';
import { Card, PageHeader, Spinner, ErrorState } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api, type Paginated } from '@/lib/api';
import { useEffect, useState } from 'react';

interface Counts {
  customers?: number;
  leads?: number;
  deals?: number;
  tours?: number;
  bookings?: number;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<Paginated<{ id: string }>>('/customers?limit=1').then((r) => r.total),
      api.get<Paginated<{ id: string }>>('/leads?limit=1').then((r) => r.total),
      api.get<Paginated<{ id: string }>>('/deals?limit=1').then((r) => r.total),
      api.get<Paginated<{ id: string }>>('/tours?limit=1').then((r) => r.total),
      api.get<Paginated<{ id: string }>>('/bookings?limit=1').then((r) => r.total),
    ])
      .then(([customers, leads, deals, tours, bookings]) => {
        if (!active) return;
        setCounts({ customers, leads, deals, tours, bookings });
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Signed in as ${user?.email}`} action={<button className="btn btn-ghost" onClick={logout}>Log out</button>} />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <Card title="Key metrics">
          <div className="form-grid">
            {(
              [
                ['Customers', counts.customers, '/customers'],
                ['Leads', counts.leads, '/leads'],
                ['Deals', counts.deals, '/deals'],
                ['Tours', counts.tours, '/tours'],
                ['Bookings', counts.bookings, '/bookings'],
              ] as const
            ).map(([label, value, href]) => (
              <div key={label} className="card">
                <div className="card-body">
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700 }}>{value ?? '–'}</div>
                  <Link href={href} style={{ fontSize: 13 }}>
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
