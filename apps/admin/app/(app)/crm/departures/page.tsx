'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Table,
} from '@/components/ui';

interface DepartureItem {
  id: string;
  tourId?: string;
  tour?: { id: string; name?: string };
  startDate?: string;
  endDate?: string;
  status?: string;
  maxPax?: number;
  price?: number | string;
  currency?: string;
}

interface TourOption {
  id: string;
  name?: string;
}

const STATUSES = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const initialForm = {
  tourId: '',
  startDate: '',
  endDate: '',
  status: 'DRAFT',
  maxPax: '',
  price: '',
  currency: 'GHS',
};

export default function CrmDeparturesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<DepartureItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DepartureItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tours, setTours] = useState<TourOption[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<DepartureItem>>(`/departures?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departures');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<Paginated<TourOption>>('/tours?limit=200')
      .then((r) => setTours(r.items ?? []))
      .catch(() => undefined);
  }, []);

  function loadIntoForm(d: DepartureItem) {
    setEditing(d);
    setFormError(null);
    setForm({
      tourId: d.tourId ?? d.tour?.id ?? '',
      startDate: d.startDate ? d.startDate.slice(0, 10) : '',
      endDate: d.endDate ? d.endDate.slice(0, 10) : '',
      status: d.status ?? 'DRAFT',
      maxPax: d.maxPax != null ? String(d.maxPax) : '',
      price: d.price != null ? String(d.price) : '',
      currency: d.currency ?? 'GHS',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(initialForm);
    setFormError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const body: Record<string, unknown> = {
      tourId: form.tourId || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      status: form.status,
      maxPax: form.maxPax ? Number(form.maxPax) : undefined,
      price: form.price ? Number(form.price) : undefined,
      currency: form.currency || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/departures/${editing.id}`, body);
      } else {
        await api.post('/departures', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(d: DepartureItem) {
    const label = d.tour?.name ?? d.startDate ?? 'this departure';
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
      await api.delete(`/departures/${d.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Departures"
        subtitle={editing ? 'Edit departure details' : 'Manage tour departures and schedules'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <Button variant="secondary" onClick={reset}>
                Cancel edit
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              New departure
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit departure` : 'New departure'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Select
              label="Tour *"
              name="tourId"
              value={form.tourId}
              onChange={(e) => setForm({ ...form, tourId: e.target.value })}
              options={[{ value: '', label: '— Select tour —' }, ...tours.map((t) => ({ value: t.id, label: t.name ?? t.id }))]}
            />
            <Input label="Start date" name="startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End date" name="endDate" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <Select label="Status" name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            <Input label="Max pax" name="maxPax" type="number" value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: e.target.value })} />
            <Input label="Price" name="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create departure'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<DepartureItem>
            keyOf={(d) => d.id}
            rows={data.items}
            columns={[
              { key: 'tour', label: 'Tour', render: (d) => d.tour?.name ?? '—' },
              { key: 'startDate', label: 'Start', render: (d) => d.startDate ? new Date(d.startDate).toLocaleDateString() : '—' },
              { key: 'endDate', label: 'End', render: (d) => d.endDate ? new Date(d.endDate).toLocaleDateString() : '—' },
              { key: 'status', label: 'Status', render: (d) => <Badge>{d.status ?? '—'}</Badge> },
              { key: 'maxPax', label: 'Capacity', render: (d) => d.maxPax ?? '—' },
              {
                key: 'price',
                label: 'Price',
                render: (d) => (d.price != null ? `${d.currency ?? ''} ${d.price}` : '—'),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (d) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(d)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(d)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <Spinner />
      )}
    </>
  );
}
