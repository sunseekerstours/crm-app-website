'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  bookingId?: string;
}

const METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'];

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Payment>(`/payments?page=${page}&limit=10`, [page]);
  const [form, setForm] = useState({ amount: '', currency: 'GHS', method: METHODS[3] });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/payments', { amount: Number(form.amount), currency: form.currency, method: form.method });
      setForm({ amount: '', currency: 'GHS', method: METHODS[3] });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Payments" subtitle="Payment records and reconciliation" />
      <Card title="Record payment">
        <form onSubmit={create}>
          <div className="form-grid">
            <Input label="Amount" name="amount" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Select label="Method" name="method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} options={METHODS.map((m) => ({ value: m, label: m }))} />
          </div>
          {formError ? <div className="error-state">{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record payment'}
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Payments">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'amount', label: 'Amount', render: (r) => `${r.amount.toLocaleString()} ${r.currency}` },
                { key: 'method', label: 'Method', render: (r) => <Badge>{r.method}</Badge> },
                { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                { key: 'paidAt', label: 'Date', render: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—') },
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
