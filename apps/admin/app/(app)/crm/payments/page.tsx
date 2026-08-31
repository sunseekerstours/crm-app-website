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

interface PaymentItem {
  id: string;
  amount?: number | string;
  currency?: string;
  method?: string;
  status?: string;
  paidAt?: string;
  bookingId?: string;
  booking?: { id: string; bookingNumber?: string };
}

const METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'];
const STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

const initialForm = {
  amount: '',
  currency: 'GHS',
  method: 'CASH',
  status: 'PENDING',
  paidAt: '',
  bookingId: '',
};

export default function CrmPaymentsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PaymentItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<PaymentItem>>(`/payments?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function loadIntoForm(p: PaymentItem) {
    setEditing(p);
    setFormError(null);
    setForm({
      amount: p.amount != null ? String(p.amount) : '',
      currency: p.currency ?? 'GHS',
      method: p.method ?? 'CASH',
      status: p.status ?? 'PENDING',
      paidAt: p.paidAt ? p.paidAt.slice(0, 10) : '',
      bookingId: p.bookingId ?? p.booking?.id ?? '',
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
      amount: form.amount ? Number(form.amount) : undefined,
      currency: form.currency || undefined,
      method: form.method || undefined,
      status: form.status,
      paidAt: form.paidAt || undefined,
      bookingId: form.bookingId || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/payments/${editing.id}`, body);
      } else {
        await api.post('/payments', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(p: PaymentItem) {
    if (!window.confirm(`Delete payment of ${p.amount ?? ''} ${p.currency ?? ''}? This cannot be undone.`)) return;
    try {
      await api.delete(`/payments/${p.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={editing ? 'Edit payment details' : 'Manage payment records'}
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
              New payment
            </Button>
          </div>
        }
      />

      <Card title={editing ? 'Edit payment' : 'New payment'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="Amount *" name="amount" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Select label="Method" name="method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} options={METHODS.map((m) => ({ value: m, label: m.replace('_', ' ') }))} />
            <Select label="Status" name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            <Input label="Paid at" name="paidAt" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
            <Input label="Booking ID" name="bookingId" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} placeholder="UUID of the booking" />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create payment'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<PaymentItem>
            keyOf={(p) => p.id}
            rows={data.items}
            columns={[
              {
                key: 'amount',
                label: 'Amount',
                render: (p) => (p.amount != null ? `${p.currency ?? ''} ${p.amount}` : '—'),
              },
              { key: 'method', label: 'Method', render: (p) => p.method?.replace('_', ' ') ?? '—' },
              { key: 'status', label: 'Status', render: (p) => <Badge>{p.status ?? '—'}</Badge> },
              { key: 'paidAt', label: 'Date', render: (p) => (p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—') },
              {
                key: 'booking',
                label: 'Booking',
                render: (p) => p.booking?.bookingNumber ?? p.bookingId ?? '—',
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (p) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(p)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(p)}>
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
