'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Badge, Card, PageHeader, Pagination, Spinner, Table } from '@/components/ui';

interface TourItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  basePrice?: number | string;
  currency?: string;
  durationDays?: number;
  destinations?: { destination: { id: string; name: string } }[];
}

export default function CrmToursPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<TourItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<TourItem>>(`/tours?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tours');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Tours (CRM)" subtitle="Read-only oversight of tours managed in the CRM" />
      <Card>
        {error ? <div className="error-state">Error: {error}</div> : null}
        {data ? (
          <>
            <Table<TourItem>
              keyOf={(t) => t.id}
              rows={data.items}
              columns={[
                { key: 'name', label: 'Tour', render: (t) => t.name },
                {
                  key: 'destinations',
                  label: 'Destinations',
                  render: (t) =>
                    (t.destinations?.map((d) => d.destination.name).join(', ') ?? '—'),
                },
                {
                  key: 'price',
                  label: 'Price',
                  render: (t) =>
                    t.basePrice != null
                      ? `${t.currency ?? ''} ${t.basePrice}`
                      : '—',
                },
                { key: 'durationDays', label: 'Days', render: (t) => t.durationDays ?? '—' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (t) => <Badge>{t.status}</Badge>,
                },
                { key: 'slug', label: 'Slug', render: (t) => <code>/{t.slug}</code> },
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
