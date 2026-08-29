'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api, type Paginated } from '@/lib/api';

interface Departure {
  id: string;
  tourId: string;
  startDate: string;
  endDate: string;
  status: string;
  maxPax?: number;
  bookedCount: number;
  price?: number;
  currency: string;
}

interface Tour {
  id: string;
  name: string;
}

export default function DeparturesPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Departure>(`/departures?page=${page}&limit=10`, [page]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [form, setForm] = useState({ tourId: '', startDate: '', endDate: '', maxPax: '', price: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useState(() => {
    api
      .get<Paginated<Tour>>('/tours?limit=100')
      .then((r) => setTours(r.items))
      .catch(() => undefined);
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/departures', {
        tourId: form.tourId,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        maxPax: form.maxPax ? Number(form.maxPax) : undefined,
        price: form.price ? Number(form.price) : undefined,
      });
      setForm({ tourId: '', startDate: '', endDate: '', maxPax: '', price: '' });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Departures" subtitle="Scheduled departures for tours" />
      <Card title="New departure">
        <form onSubmit={create}>
          <div className="form-grid">
            <Select label="Tour" name="tourId" value={form.tourId} onChange={(e) => setForm({ ...form, tourId: e.target.value })} options={tours.map((t) => ({ value: t.id, label: t.name }))} />
            <Input label="Start date" name="startDate" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End date" name="endDate" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <Input label="Max pax" name="maxPax" type="number" value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: e.target.value })} />
            <Input label="Price" name="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          {formError ? <div className="error-state">{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create departure'}
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Departures">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'start', label: 'Start', render: (r) => new Date(r.startDate).toLocaleDateString() },
                { key: 'end', label: 'End', render: (r) => new Date(r.endDate).toLocaleDateString() },
                { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                { key: 'capacity', label: 'Capacity', render: (r) => `${r.bookedCount}/${r.maxPax ?? '∞'}` },
                { key: 'price', label: 'Price', render: (r) => (r.price != null ? `${r.price} ${r.currency}` : '—') },
              ]}
              rows={data?.items ?? []}
            />
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
