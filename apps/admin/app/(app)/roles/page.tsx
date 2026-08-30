'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Badge, Card, PageHeader, Pagination, Spinner, Table } from '@/components/ui';

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions?: { id: string; key: string }[];
}

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<RoleItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Paginated<RoleItem>>(`/roles?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Roles" subtitle="System roles and the permissions granted to each" />
      <Card>
        {error ? <div className="error-state">Error: {error}</div> : null}
        {data ? (
          <>
            <Table<RoleItem>
              keyOf={(r) => r.id}
              rows={data.items}
              columns={[
                {
                  key: 'name',
                  label: 'Role',
                  render: (r) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {r.name}
                      {r.isSystem ? <Badge>system</Badge> : null}
                    </span>
                  ),
                },
                { key: 'description', label: 'Description', render: (r) => r.description ?? '—' },
                {
                  key: 'permissions',
                  label: 'Permissions',
                  render: (r) => {
                    const perms = r.permissions ?? [];
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {perms.length === 0 ? (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        ) : (
                          perms.slice(0, 12).map((p) => <Badge key={p.key}>{p.key}</Badge>)
                        )}
                        {perms.length > 12 ? (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                            +{perms.length - 12} more
                          </span>
                        ) : null}
                      </div>
                    );
                  },
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
