'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Card, PageHeader, Pagination, Spinner, Table } from '@/components/ui';

interface AuditItem {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AuditItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<AuditItem>>(`/audit?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Audit Log" subtitle="A record of administrative actions across the platform" />
      <Card>
        {error ? <div className="error-state">Error: {error}</div> : null}
        {data ? (
          <>
            <Table<AuditItem>
              keyOf={(a) => a.id}
              rows={data.items}
              columns={[
                {
                  key: 'time',
                  label: 'When',
                  render: (a) => new Date(a.createdAt).toLocaleString(),
                },
                {
                  key: 'user',
                  label: 'User',
                  render: (a) => a.userEmail ?? a.userId ?? 'system',
                },
                { key: 'action', label: 'Action', render: (a) => <code>{a.action}</code> },
                { key: 'entityType', label: 'Entity', render: (a) => a.entityType ?? '—' },
                { key: 'entityId', label: 'Entity ID', render: (a) => a.entityId ?? '—' },
                {
                  key: 'after',
                  label: 'Details',
                  render: (a) => {
                    const d = a.after && Object.keys(a.after).length ? a.after : a.before;
                    return d ? (
                      <code style={{ fontSize: 12 }}>{JSON.stringify(d)}</code>
                    ) : (
                      '—'
                    );
                  },
                },
                { key: 'ip', label: 'IP', render: (a) => a.ipAddress ?? '—' },
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
