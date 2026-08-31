'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface DealItem {
  id: string;
  name?: string;
  customerId?: string;
  customer?: CustomerOption;
  value?: number | string;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
}

const STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'DEPOSIT', 'WON', 'LOST'];
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const initialForm = {
  name: '',
  customerId: '',
  value: '',
  currency: 'USD',
  stage: 'NEW',
  probability: '50',
  expectedCloseDate: '',
};

export default function CrmDealsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Paginated<DealItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DealItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  // Quick Customer Creation modal inside deal form
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '50', page: String(page) });
      if (search) q.set('search', search);
      const res = await api.get<Paginated<DealItem>>(`/deals?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    }
  }, [page, search]);

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
      currency: d.currency ?? 'USD',
      stage: d.stage ?? 'NEW',
      probability: d.probability != null ? String(d.probability) : '50',
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
      currency: form.currency || 'USD',
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
      setFormError(err instanceof Error ? err.message : 'Failed to save deal');
    } finally {
      setSubmitting(false);
    }
  }

  async function generateQuoteForDeal(d: DealItem) {
    try {
      const amount = Number(d.value) || 0;
      const res = await api.post<any>('/quotes', {
        dealId: d.id,
        customerId: d.customerId ?? d.customer?.id,
        tourName: d.name,
        currency: d.currency || 'USD',
        totalPrice: amount,
        items: [
          {
            description: `${d.name} (Proposal)`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        ],
      });
      alert(`Quotation ${res.quoteNumber} created from Deal! You can view and print it in Invoices & Quotes.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create quote');
    }
  }

  async function generateInvoiceForDeal(d: DealItem) {
    try {
      const amount = Number(d.value) || 0;
      const res = await api.post<any>('/invoices', {
        dealId: d.id,
        customerId: d.customerId ?? d.customer?.id,
        currency: d.currency || 'USD',
        amount,
        items: [
          {
            description: `${d.name}`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        ],
      });
      alert(`Invoice ${res.invoiceNumber} created from Deal!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  }

  async function submitNewCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await api.post<CustomerOption>('/customers', newCust);
      setCustomers((prev) => [created, ...prev]);
      setForm((f) => ({ ...f, customerId: created.id }));
      setShowAddCustomer(false);
      setNewCust({ firstName: '', lastName: '', email: '', phone: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create customer');
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
    <div style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        title="Sales Deals & Pipelines"
        subtitle={editing ? `Edit Deal: ${editing.name}` : 'Track sales opportunities, customer values, and generate proposals'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <Button variant="secondary" onClick={reset}>
                Cancel Edit
              </Button>
            ) : null}
            <Button
              onClick={() => {
                reset();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              + Create New Deal
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit Deal: ${editing.name ?? editing.id}` : 'New Sales Deal'}>
        {formError && <ErrorState message={formError} />}

        <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
          <div className="form-grid">
            <Input
              label="Deal / Opportunity Name *"
              name="name"
              required
              value={form.name}
              placeholder="e.g. 8-Pax Ghana Corporate Retreat"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <div>
              <label className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="field-label">Customer</span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(true)}
                    style={{ background: 'none', border: 'none', color: '#008744', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    + Add New Customer
                  </button>
                </div>
                <select
                  className="input"
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                >
                  <option value="">— Select customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {customerLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Input
              label="Deal Value ($/₵)"
              name="value"
              type="number"
              value={form.value}
              placeholder="8500"
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />

            <Select
              label="Currency"
              name="currency"
              value={form.currency}
              options={CURRENCIES}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />

            <Select
              label="Pipeline Stage"
              name="stage"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              options={STAGES.map((s) => ({ value: s, label: s }))}
            />

            <Input
              label="Win Probability (%)"
              name="probability"
              type="number"
              value={form.probability}
              placeholder="50"
              onChange={(e) => setForm({ ...form, probability: e.target.value })}
            />

            <Input
              label="Expected Close Date"
              name="expectedCloseDate"
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving Deal…' : editing ? 'Update Deal' : 'Create Deal'}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Deals Table */}
      {error && <ErrorState message={error} />}
      {data ? (
        <Card
          title="All Sales Deals"
          action={
            <input
              type="search"
              placeholder="Search deals..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          }
        >
          <Table<DealItem>
            keyOf={(d) => d.id}
            rows={data.items}
            columns={[
              {
                key: 'name',
                label: 'Deal Name',
                render: (d) => (
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{d.name ?? 'Untitled'}</div>
                    {d.expectedCloseDate && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Close: {new Date(d.expectedCloseDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Customer',
                render: (d) =>
                  d.customer ? (
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {`${d.customer.firstName ?? ''} ${d.customer.lastName ?? ''}`.trim() || 'Customer'}
                      </div>
                      {d.customer.email && <div style={{ fontSize: '11px', color: '#64748b' }}>{d.customer.email}</div>}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  ),
              },
              {
                key: 'value',
                label: 'Estimated Value',
                render: (d) => (
                  <span style={{ fontWeight: '800', color: '#008744', fontSize: '14px' }}>
                    {d.value != null ? `${d.currency ?? '$'} ${(Number(d.value) || 0).toLocaleString()}` : '—'}
                  </span>
                ),
              },
              {
                key: 'stage',
                label: 'Stage',
                render: (d) => {
                  const color = d.stage === 'WON' ? '#16a34a' : d.stage === 'LOST' ? '#dc2626' : '#ea580c';
                  return (
                    <Badge>
                      <span style={{ color, fontWeight: 'bold' }}>● {d.stage ?? '—'}</span>
                    </Badge>
                  );
                },
              },
              {
                key: 'docs',
                label: 'Actions & Documents',
                render: (d) => (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => generateQuoteForDeal(d)}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                      title="Create Quotation Proposal for this deal"
                    >
                      + Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => generateInvoiceForDeal(d)}
                      style={{
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                      title="Generate Invoice for this deal"
                    >
                      + Invoice
                    </button>
                  </div>
                ),
              },
              {
                key: 'actions',
                label: 'Manage',
                render: (d) => (
                  <div style={{ display: 'flex', gap: 6 }}>
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
        </Card>
      ) : (
        <Spinner />
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '800' }}>Add Customer to Deal</h3>
            <form onSubmit={submitNewCustomer} style={{ display: 'grid', gap: '12px' }}>
              <Input
                label="First Name *"
                name="firstName"
                value={newCust.firstName}
                onChange={(e) => setNewCust({ ...newCust, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name *"
                name="lastName"
                value={newCust.lastName}
                onChange={(e) => setNewCust({ ...newCust, lastName: e.target.value })}
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={newCust.email}
                onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
              />
              <Input
                label="Phone"
                name="phone"
                value={newCust.phone}
                onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button type="submit">Save Customer</Button>
                <Button variant="secondary" onClick={() => setShowAddCustomer(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
