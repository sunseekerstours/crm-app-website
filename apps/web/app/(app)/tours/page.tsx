'use client';

import { useState } from 'react';
import { Button, Card, Input, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';

interface Tour {
  id: string;
  name: string;
  durationDays?: number;
  basePrice?: number;
  currency?: string;
  type?: string;
  status: string;
}

export default function ToursPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Tour>(`/tours?page=${page}&limit=10`, [page]);
  const [form, setForm] = useState({ name: '', durationDays: '', basePrice: '', currency: 'GHS' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/tours', {
        name: form.name,
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        basePrice: form.basePrice ? Number(form.basePrice) : undefined,
        currency: form.currency,
      });
      setForm({ name: '', durationDays: '', basePrice: '', currency: 'GHS' });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Tours" subtitle="Product catalogue of tours and itineraries" />
      <Card title="New tour">
        <form onSubmit={create}>
          <div className="form-grid">
            <Input label="Name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Duration (days)" name="durationDays" type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            <Input label="Base price" name="basePrice" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          {formError ? <div className="error-state">{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create tour'}
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Tours">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type' },
                { key: 'duration', label: 'Days', render: (r) => r.durationDays ?? '—' },
                { key: 'price', label: 'Base price', render: (r) => (r.basePrice != null ? `${r.basePrice.toLocaleString()} ${r.currency ?? ''}` : '—') },
                { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
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
