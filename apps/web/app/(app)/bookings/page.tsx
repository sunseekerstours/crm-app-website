'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api, type Paginated } from '@/lib/api';

interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  status: string;
  paxCount: number;
  totalPrice?: number;
  currency: string;
  tourName?: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
}

export default function BookingsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Booking>(`/bookings?page=${page}&limit=10`, [page]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ customerId: '', tourName: '', paxCount: '1', totalPrice: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useState(() => {
    api
      .get<Paginated<Customer>>('/customers?limit=100')
      .then((r) => setCustomers(r.items))
      .catch(() => undefined);
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/bookings', {
        customerId: form.customerId,
        tourName: form.tourName || undefined,
        paxCount: Number(form.paxCount),
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
      });
      setForm({ customerId: '', tourName: '', paxCount: '1', totalPrice: '' });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Confirmed and pending reservations" />
      <Card title="New booking">
        <form onSubmit={create}>
          <div className="form-grid">
            <Input name="customerSearch" placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
            <Select label="Customer" name="customerId" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={customers.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase())).map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))} />
            <Input label="Tour name" name="tourName" value={form.tourName} onChange={(e) => setForm({ ...form, tourName: e.target.value })} />
            <Input label="Pax count" name="paxCount" type="number" value={form.paxCount} onChange={(e) => setForm({ ...form, paxCount: e.target.value })} />
            <Input label="Total price" name="totalPrice" type="number" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
          </div>
          {formError ? <div className="error-state">{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create booking'}
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Bookings">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'bookingNumber', label: 'Number' },
                { key: 'tourName', label: 'Tour' },
                { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                { key: 'pax', label: 'Pax', render: (r) => r.paxCount },
                { key: 'total', label: 'Total', render: (r) => (r.totalPrice != null ? `${r.totalPrice} ${r.currency}` : '—') },
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
