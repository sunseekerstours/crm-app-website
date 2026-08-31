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
  Textarea,
} from '@/components/ui';

interface ProductItem {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  price?: number | string | null;
  currency?: string;
  isActive?: boolean;
  _count?: { customers?: number };
}

const CATEGORIES = ['GHANA_TOUR', 'INTERNATIONAL_TOUR', 'FLIGHT', 'HOTEL', 'CAR_RENTAL', 'OTHER'];

const initialForm = {
  name: '',
  slug: '',
  category: 'GHANA_TOUR',
  description: '',
  price: '',
  currency: 'GHS',
  isActive: true,
};

export default function CrmProductsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ProductItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<ProductItem>>(`/products?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function loadIntoForm(p: ProductItem) {
    setEditing(p);
    setFormError(null);
    setForm({
      name: p.name ?? '',
      slug: p.slug ?? '',
      category: p.category ?? 'GHANA_TOUR',
      description: p.description ?? '',
      price: p.price != null ? String(p.price) : '',
      currency: p.currency ?? 'GHS',
      isActive: p.isActive ?? true,
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
      name: form.name || undefined,
      slug: form.slug || undefined,
      category: form.category || undefined,
      description: form.description || undefined,
      price: form.price || undefined,
      currency: form.currency,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await api.patch(`/products/${editing.id}`, body);
      } else {
        await api.post('/products', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(p: ProductItem) {
    if (!window.confirm(`Delete "${p.name}"? Customers linked to it will be unlinked.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Products & Services"
        subtitle={editing ? 'Edit product or service' : 'Tours, flights, hotels and services you sell'}
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
              New product
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit: ${editing.name}` : 'New product / service'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="Name *" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Slug" name="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. ghana-classic-tour" />
            <Select
              label="Category"
              name="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') }))}
            />
            <Input label="Price" name="price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 8500" />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <label className="field">
              <span className="field-label">Active</span>
              <select
                className="input"
                value={form.isActive ? 'true' : 'false'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <Textarea label="Description" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<ProductItem>
            keyOf={(p) => p.id}
            rows={data.items}
            columns={[
              { key: 'name', label: 'Name', render: (p) => p.name },
              { key: 'category', label: 'Category', render: (p) => (p.category ? p.category.replace('_', ' ') : '—') },
              { key: 'price', label: 'Price', render: (p) => (p.price != null ? `${p.price} ${p.currency ?? ''}` : '—') },
              {
                key: 'customers',
                label: 'Customers',
                render: (p) => (p._count?.customers ?? 0) > 0 ? <Badge>{p._count!.customers}</Badge> : '—',
              },
              { key: 'isActive', label: 'Active', render: (p) => (p.isActive ? <Badge>Active</Badge> : '—') },
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
