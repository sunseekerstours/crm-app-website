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

interface BookingItem {
  id: string;
  bookingNumber?: string;
  customerId?: string;
  customer?: { id: string; firstName?: string; lastName?: string; email?: string };
  departureId?: string;
  departure?: { id: string; tour?: { name?: string }; startDate?: string };
  status?: string;
  paxCount?: number;
  totalPrice?: number | string;
  currency?: string;
  bookedAt?: string;
}

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface DepartureOption {
  id: string;
  tour?: { name?: string };
  startDate?: string;
}

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

const initialForm = {
  customerId: '',
  departureId: '',
  status: 'PENDING',
  paxCount: '',
  totalPrice: '',
  currency: 'GHS',
};

export default function CrmBookingsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<BookingItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BookingItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);

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

  useEffect(() => {
    api
      .get<Paginated<CustomerOption>>('/customers?limit=200')
      .then((r) => setCustomers(r.items ?? []))
      .catch(() => undefined);
    api
      .get<Paginated<DepartureOption>>('/departures?limit=200')
      .then((r) => setDepartures(r.items ?? []))
      .catch(() => undefined);
  }, []);

  function loadIntoForm(b: BookingItem) {
    setEditing(b);
    setFormError(null);
    setForm({
      customerId: b.customerId ?? b.customer?.id ?? '',
      departureId: b.departureId ?? b.departure?.id ?? '',
      status: b.status ?? 'PENDING',
      paxCount: b.paxCount != null ? String(b.paxCount) : '',
      totalPrice: b.totalPrice != null ? String(b.totalPrice) : '',
      currency: b.currency ?? 'GHS',
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
      customerId: form.customerId || undefined,
      departureId: form.departureId || undefined,
      status: form.status,
      paxCount: form.paxCount ? Number(form.paxCount) : undefined,
      totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
      currency: form.currency || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/bookings/${editing.id}`, body);
      } else {
        await api.post('/bookings', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(b: BookingItem) {
    if (!window.confirm(`Delete booking ${b.bookingNumber ?? ''}? This cannot be undone.`)) return;
    try {
      await api.delete(`/bookings/${b.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function customerLabel(c: CustomerOption) {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    return name || c.email || c.id;
  }

  function departureLabel(d: DepartureOption) {
    const tour = d.tour?.name ?? 'Unknown tour';
    const date = d.startDate ? new Date(d.startDate).toLocaleDateString() : '';
    return date ? `${tour} — ${date}` : tour;
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle={editing ? 'Edit booking details' : 'Manage customer bookings'}
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
              New booking
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit booking: ${editing.bookingNumber ?? editing.id}` : 'New booking'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Select
              label="Customer *"
              name="customerId"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              options={[{ value: '', label: '— Select customer —' }, ...customers.map((c) => ({ value: c.id, label: customerLabel(c) }))]}
            />
            <Select
              label="Departure *"
              name="departureId"
              value={form.departureId}
              onChange={(e) => setForm({ ...form, departureId: e.target.value })}
              options={[{ value: '', label: '— Select departure —' }, ...departures.map((d) => ({ value: d.id, label: departureLabel(d) }))]}
            />
            <Select label="Status" name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            <Input label="Pax count" name="paxCount" type="number" value={form.paxCount} onChange={(e) => setForm({ ...form, paxCount: e.target.value })} />
            <Input label="Total price" name="totalPrice" type="number" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create booking'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<BookingItem>
            keyOf={(b) => b.id}
            rows={data.items}
            columns={[
              { key: 'bookingNumber', label: 'Booking #', render: (b) => b.bookingNumber ?? '—' },
              { key: 'tour', label: 'Tour', render: (b) => b.departure?.tour?.name ?? '—' },
              {
                key: 'customer',
                label: 'Customer',
                render: (b) =>
                  b.customer
                    ? `${b.customer.firstName ?? ''} ${b.customer.lastName ?? ''}`.trim() || b.customer.email || '—'
                    : '—',
              },
              {
                key: 'totalPrice',
                label: 'Total',
                render: (b) => (b.totalPrice != null ? `${b.currency ?? ''} ${b.totalPrice}` : '—'),
              },
              { key: 'status', label: 'Status', render: (b) => <Badge>{b.status ?? '—'}</Badge> },
              {
                key: 'bookedAt',
                label: 'Booked',
                render: (b) => (b.bookedAt ? new Date(b.bookedAt).toLocaleDateString() : '—'),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (b) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(b)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(b)}>
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
