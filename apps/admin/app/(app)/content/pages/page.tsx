'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Badge, Button, Card, PageHeader, Pagination, Spinner, Table } from '@/components/ui';

interface PageItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
}

export default function ContentPagesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PageItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<PageItem>>(`/pages?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removePage(id: string, title: string) {
    if (!window.confirm(`Delete page "${title}"?`)) return;
    try {
      await api.delete(`/pages/${id}`);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete page');
    }
  }

  return (
    <>
      <PageHeader
        title="Site Pages"
        subtitle="Manage content pages served on the public website"
        action={<Link href="/content/pages/new">New page</Link>}
      />
      <Card>
        {error ? <div className="error-state">Error: {error}</div> : null}
        {data ? (
          <>
            <Table<PageItem>
              keyOf={(p) => p.id}
              rows={data.items}
              columns={[
                { key: 'title', label: 'Title', render: (p) => p.title },
                { key: 'slug', label: 'Slug', render: (p) => <code>/{p.slug}</code> },
                {
                  key: 'status',
                  label: 'Status',
                  render: (p) => (
                    <Badge>{p.status === 'PUBLISHED' ? 'Published' : p.status.toLowerCase()}</Badge>
                  ),
                },
                {
                  key: 'updated',
                  label: 'Updated',
                  render: (p) => new Date(p.updatedAt).toLocaleString(),
                },
                {
                  key: 'actions',
                  label: '',
                  render: (p) => (
                    <span style={{ display: 'inline-flex', gap: 8 }}>
                      <Link className="btn btn-ghost" href={`/content/pages/${p.id}/edit`}>
                        Edit
                      </Link>
                      <Button variant="danger" onClick={() => removePage(p.id, p.title)}>
                        Delete
                      </Button>
                    </span>
                  ),
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
