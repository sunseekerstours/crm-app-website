'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';

interface Deal {
  id: string;
  name: string;
  customerId?: string;
  value?: number;
  currency?: string;
  stage: string;
  probability?: number;
  expectedCloseDate?: string;
}

const STAGES = ['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

export default function DealsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Deal>(`/deals?page=${page}&limit=10`, [page]);
  const [form, setForm] = useState({ name: '', value: '', currency: 'GHS', stage: STAGES[0] });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/deals', { ...form, value: form.value ? Number(form.value) : undefined });
      setForm({ name: '', value: '', currency: 'GHS', stage: STAGES[0] });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Deals" subtitle="Sales opportunities and pipeline" />
      <Card title="New deal">
        <form onSubmit={create}>
          <div className="form-grid">
            <Input label="Name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Value" name="value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Select label="Stage" name="stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} options={STAGES.map((s) => ({ value: s, label: s }))} />
          </div>
          {formError ? <div className="error-state">{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create deal'}
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Deals">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'value', label: 'Value', render: (r) => (r.value != null ? `${r.value.toLocaleString()} ${r.currency ?? ''}` : '—') },
                { key: 'stage', label: 'Stage', render: (r) => <Badge>{r.stage}</Badge> },
                { key: 'probability', label: 'Probability', render: (r) => (r.probability != null ? `${r.probability}%` : '—') },
                { key: 'close', label: 'Expected close', render: (r) => (r.expectedCloseDate ? new Date(r.expectedCloseDate).toLocaleDateString() : '—') },
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
