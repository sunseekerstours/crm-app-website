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

interface DealItem {
  id: string;
  name?: string;
  customerId?: string;
  customer?: { id: string; firstName?: string; lastName?: string; email?: string };
  value?: number | string;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
}

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

const STAGES = ['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

const initialForm = {
  name: '',
  customerId: '',
  value: '',
  currency: 'GHS',
  stage: 'PROSPECT',
  probability: '',
  expectedCloseDate: '',
};

export default function CrmDealsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<DealItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DealItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<DealItem>>(`/deals?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
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
  }, []);

  function loadIntoForm(d: DealItem) {
    setEditing(d);
    setFormError(null);
    setForm({
      name: d.name ?? '',
      customerId: d.customerId ?? d.customer?.id ?? '',
      value: d.value != null ? String(d.value) : '',
      currency: d.currency ?? 'GHS',
      stage: d.stage ?? 'PROSPECT',
      probability: d.probability != null ? String(d.probability) : '',
      expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.slice(0, 10) : '',
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
      name: form.name || undefined,
      customerId: form.customerId || undefined,
      value: form.value ? Number(form.value) : undefined,
      currency: form.currency || undefined,
      stage: form.stage,
      probability: form.probability ? Number(form.probability) : undefined,
      expectedCloseDate: form.expectedCloseDate || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/deals/${editing.id}`, body);
      } else {
        await api.post('/deals', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(d: DealItem) {
    if (!window.confirm(`Delete deal "${d.name ?? ''}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/deals/${d.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function customerLabel(c: CustomerOption) {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    return name || c.email || c.id;
  }

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle={editing ? 'Edit deal details' : 'Manage your sales pipeline'}
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
              New deal
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit: ${editing.name}` : 'New deal'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="Deal name *" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select
              label="Customer"
              name="customerId"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              options={[{ value: '', label: '— Select customer —' }, ...customers.map((c) => ({ value: c.id, label: customerLabel(c) }))]}
            />
            <Input label="Value" name="value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Select label="Stage" name="stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} options={STAGES.map((s) => ({ value: s, label: s }))} />
            <Input label="Probability %" name="probability" type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            <Input label="Expected close date" name="expectedCloseDate" type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create deal'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<DealItem>
            keyOf={(d) => d.id}
            rows={data.items}
            columns={[
              { key: 'name', label: 'Name', render: (d) => d.name ?? '—' },
              {
                key: 'value',
                label: 'Value',
                render: (d) => (d.value != null ? `${d.currency ?? ''} ${d.value}` : '—'),
              },
              { key: 'stage', label: 'Stage', render: (d) => <Badge>{d.stage ?? '—'}</Badge> },
              { key: 'probability', label: 'Probability', render: (d) => d.probability != null ? `${d.probability}%` : '—' },
              {
                key: 'expectedCloseDate',
                label: 'Close date',
                render: (d) => (d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : '—'),
              },
              {
                key: 'customer',
                label: 'Customer',
                render: (d) =>
                  d.customer
                    ? `${d.customer.firstName ?? ''} ${d.customer.lastName ?? ''}`.trim() || d.customer.email || '—'
                    : '—',
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
