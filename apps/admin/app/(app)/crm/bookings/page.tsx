'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Badge, Card, PageHeader, Pagination, Spinner, Table } from '@/components/ui';

interface BookingItem {
  id: string;
  bookingNumber?: string;
  tourName?: string;
  status?: string;
  bookedAt?: string;
  totalAmount?: number | string;
  currency?: string;
  customer?: { firstName?: string; lastName?: string; email?: string };
}

export default function CrmBookingsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<BookingItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<BookingItem>>(`/bookings?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Bookings (CRM)" subtitle="Read-only oversight of bookings" />
      <Card>
        {error ? <div className="error-state">Error: {error}</div> : null}
        {data ? (
          <>
            <Table<BookingItem>
              keyOf={(b) => b.id}
              rows={data.items}
              columns={[
                {
                  key: 'bookingNumber',
                  label: 'Booking #',
                  render: (b) => b.bookingNumber ?? '—',
                },
                { key: 'tourName', label: 'Tour', render: (b) => b.tourName ?? '—' },
                {
                  key: 'customer',
                  label: 'Customer',
                  render: (b) =>
                    b.customer
                      ? `${b.customer.firstName ?? ''} ${b.customer.lastName ?? ''}`.trim() || b.customer.email || '—'
                      : '—',
                },
                {
                  key: 'totalAmount',
                  label: 'Total',
                  render: (b) =>
                    b.totalAmount != null ? `${b.currency ?? ''} ${b.totalAmount}` : '—',
                },
                { key: 'status', label: 'Status', render: (b) => <Badge>{b.status ?? '—'}</Badge> },
                {
                  key: 'bookedAt',
                  label: 'Booked',
                  render: (b) => (b.bookedAt ? new Date(b.bookedAt).toLocaleDateString() : '—'),
                },
              ]}
            />
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        ) : (
          <Spinner />
        )}
      </Card>
    </>
  );
}
