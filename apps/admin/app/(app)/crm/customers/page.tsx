'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Badge, Card, PageHeader, Pagination, Spinner, Table } from '@/components/ui';

interface CustomerItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  type?: string;
}

export default function CrmCustomersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<CustomerItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<CustomerItem>>(`/customers?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Customers (CRM)" subtitle="Read-only oversight of customers" />
      <Card>
        {error ? <div className="error-state">Error: {error}</div> : null}
        {data ? (
          <>
            <Table<CustomerItem>
              keyOf={(c) => c.id}
              rows={data.items}
              columns={[
                {
                  key: 'name',
                  label: 'Name',
                  render: (c) => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—',
                },
                { key: 'email', label: 'Email', render: (c) => c.email ?? '—' },
                { key: 'phone', label: 'Phone', render: (c) => c.phone ?? '—' },
                { key: 'type', label: 'Type', render: (c) => c.type ?? '—' },
                { key: 'status', label: 'Status', render: (c) => <Badge>{c.status ?? '—'}</Badge> },
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
