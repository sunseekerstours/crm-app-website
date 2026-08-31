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

interface CustomerItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  status?: string;
  products?: { id: string; name: string; category?: string }[];
}

interface Product {
  id: string;
  name: string;
  category?: string;
}

interface LinkOption {
  id: string;
  label: string;
}

const STATUSES = ['ACTIVE', 'INACTIVE', 'LEAD'];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  status: 'ACTIVE',
  productIds: [] as string[],
  linkedLeadId: '',
  linkedDealId: '',
};

export default function CrmCustomersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<CustomerItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<LinkOption[]>([]);
  const [deals, setDeals] = useState<LinkOption[]>([]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await api.get<Paginated<Product>>('/products?limit=200');
      setProducts(res.items ?? []);
    } catch {
      setProducts([]);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const res = await api.get<Paginated<LinkOption & { firstName?: string; lastName?: string }>>('/leads?limit=200');
      setLeads(
        (res.items ?? []).map((l) => ({
          id: l.id,
          label: `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || l.id.slice(0, 8),
        })),
      );
    } catch {
      setLeads([]);
    }
  }, []);

  const loadDeals = useCallback(async () => {
    try {
      const res = await api.get<Paginated<LinkOption & { name?: string }>>('/deals?limit=200');
      setDeals((res.items ?? []).map((d) => ({ id: d.id, label: d.name ?? d.id.slice(0, 8) })));
    } catch {
      setDeals([]);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<CustomerItem>>(`/customers?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    }
  }, [page]);

  useEffect(() => {
    void load();
    void loadProducts();
    void loadLeads();
    void loadDeals();
  }, [load, loadProducts, loadLeads, loadDeals]);

  function toggleProduct(id: string) {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((p) => p !== id)
        : [...prev.productIds, id],
    }));
  }

  function loadIntoForm(c: CustomerItem) {
    setEditing(c);
    setFormError(null);
    setForm({
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      country: c.country ?? '',
      status: c.status ?? 'ACTIVE',
      productIds: (c.products ?? []).map((p) => p.id),
      linkedLeadId: '',
      linkedDealId: '',
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
    const body = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      country: form.country || undefined,
      status: form.status,
      productIds: form.productIds.length ? form.productIds : undefined,
      linkedLeadId: form.linkedLeadId || undefined,
      linkedDealId: form.linkedDealId || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/customers/${editing.id}`, body);
      } else {
        await api.post('/customers', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(c: CustomerItem) {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || 'this customer';
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={editing ? 'Edit customer details' : 'Manage your customer database'}
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
              New customer
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit: ${editing.firstName} ${editing.lastName}` : 'New customer'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Country" name="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Select label="Status" name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            <Select
              label="Link to existing Lead"
              name="linkedLeadId"
              value={form.linkedLeadId}
              onChange={(e) => setForm({ ...form, linkedLeadId: e.target.value })}
              options={[{ value: '', label: 'None' }, ...leads.map((l) => ({ value: l.id, label: l.label }))]}
            />
            <Select
              label="Link to existing Deal"
              name="linkedDealId"
              value={form.linkedDealId}
              onChange={(e) => setForm({ ...form, linkedDealId: e.target.value })}
              options={[{ value: '', label: 'None' }, ...deals.map((d) => ({ value: d.id, label: d.label }))]}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <span className="field-label">Products / Services</span>
            {products.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
                No products yet — add them under CRM → Products &amp; Services.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 8 }}>
                {products.map((p) => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                    <span>
                      {p.name}
                      {p.category ? <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {p.category.replace('_', ' ')}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create customer'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<CustomerItem>
            keyOf={(c) => c.id}
            rows={data.items}
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (c) => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—',
              },
              { key: 'email', label: 'Email', render: (c) => c.email ?? '—' },
              { key: 'phone', label: 'Phone', render: (c) => c.phone ?? '—' },
              { key: 'country', label: 'Country', render: (c) => c.country ?? '—' },
              { key: 'status', label: 'Status', render: (c) => <Badge>{c.status ?? '—'}</Badge> },
              {
                key: 'products',
                label: 'Products & Services',
                render: (c) => (c.products && c.products.length ? c.products.map((p) => p.name).join(', ') : '—'),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (c) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(c)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(c)}>
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
