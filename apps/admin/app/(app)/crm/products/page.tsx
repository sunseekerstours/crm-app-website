'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

export interface ProductItem {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  price?: number | string | null;
  currency?: string;
  isActive?: boolean;
  createdAt?: string;
  _count?: { customers?: number };
}

const PRODUCT_CATEGORIES = [
  { value: 'TOUR_INBOUND', label: 'Tours (Inbound)', icon: '🌍', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: 'TOUR_OUTBOUND', label: 'Tours (Outbound)', icon: '✈️', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { value: 'FLEET', label: 'Fleet & Bus Rental', icon: '🚐', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'HOTEL', label: 'Hotel Reservation', icon: '🏨', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { value: 'FLIGHT', label: 'Flight Booking', icon: '🎫', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { value: 'OTHER', label: 'Other Packages & Services', icon: '📦', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
];

function getCategoryMeta(cat?: string) {
  if (!cat) return PRODUCT_CATEGORIES[5];
  // Handle aliases & legacy categories
  if (cat === 'GHANA_TOUR' || cat === 'TOUR_INBOUND' || cat === 'INBOUND') return PRODUCT_CATEGORIES[0];
  if (cat === 'INTERNATIONAL_TOUR' || cat === 'TOUR_OUTBOUND' || cat === 'OUTBOUND') return PRODUCT_CATEGORIES[1];
  if (cat === 'CAR_RENTAL' || cat === 'FLEET' || cat === 'TRANSPORT') return PRODUCT_CATEGORIES[2];
  if (cat === 'HOTEL') return PRODUCT_CATEGORIES[3];
  if (cat === 'FLIGHT') return PRODUCT_CATEGORIES[4];
  return PRODUCT_CATEGORIES.find((c) => c.value === cat) || PRODUCT_CATEGORIES[5];
}

const initialForm = {
  name: '',
  slug: '',
  category: 'TOUR_INBOUND',
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const catParam = selectedCategory !== 'ALL' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
      const res = await api.get<Paginated<ProductItem>>(`/products?limit=50&page=${page}${catParam}${searchParam}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    }
  }, [page, selectedCategory, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  function loadIntoForm(p: ProductItem) {
    setEditing(p);
    setFormError(null);
    setForm({
      name: p.name ?? '',
      slug: p.slug ?? '',
      category: p.category ?? 'TOUR_INBOUND',
      description: p.description ?? '',
      price: p.price != null ? String(p.price) : '',
      currency: p.currency ?? 'GHS',
      isActive: p.isActive ?? true,
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(initialForm);
    setFormError(null);
    setIsFormOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const body = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      category: form.category,
      description: form.description.trim() || undefined,
      price: form.price ? Number(form.price) : undefined,
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
      setFormError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(p: ProductItem) {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  }

  // Summary counts
  const items = data?.items ?? [];
  const activeCount = items.filter((p) => p.isActive).length;
  const tourCount = items.filter((p) => p.category?.includes('TOUR') || p.category?.includes('GHANA') || p.category?.includes('INTERNATIONAL')).length;
  const fleetCount = items.filter((p) => p.category === 'FLEET' || p.category === 'CAR_RENTAL').length;
  const hotelCount = items.filter((p) => p.category === 'HOTEL').length;
  const flightCount = items.filter((p) => p.category === 'FLIGHT').length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <PageHeader
        title="Product Management"
        subtitle="Configure tours, fleet rentals, hotel stays, flight bookings, and custom travel packages for your CRM"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            {isFormOpen ? (
              <Button variant="secondary" onClick={reset}>
                ✕ Close Editor
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  reset();
                  setIsFormOpen(true);
                }}
              >
                ➕ Add New Product
              </Button>
            )}
          </div>
        }
      />

      {/* METRIC CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Catalog</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{data?.total ?? 0}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Active Products</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{activeCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Tours (In & Out)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{tourCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Fleet & Bus</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706', marginTop: 4 }}>{fleetCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Hotels & Flights</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>{hotelCount + flightCount}</div>
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      {isFormOpen && (
        <div style={{ marginBottom: 24 }}>
          <Card title={editing ? `✏️ Edit Product: ${editing.name}` : '➕ Add New Product / Service'}>
            <form onSubmit={submit}>
              <div className="form-grid">
                <Input
                  label="Product / Service Name *"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cape Coast & Elmina Castle Tour, 15-Seater VIP Bus, etc."
                  required
                />

                <Select
                  label="Category *"
                  name="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  options={PRODUCT_CATEGORIES.map((c) => ({
                    value: c.value,
                    label: `${c.icon} ${c.label}`,
                  }))}
                />

                <Input
                  label="Standard Price"
                  name="price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 1500"
                />

                <Select
                  label="Currency"
                  name="currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  options={[
                    { value: 'GHS', label: 'GHS - Ghana Cedi' },
                    { value: 'USD', label: 'USD - US Dollar' },
                    { value: 'EUR', label: 'EUR - Euro' },
                    { value: 'GBP', label: 'GBP - British Pound' },
                  ]}
                />

                <Input
                  label="Slug / Identifier (Optional)"
                  name="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. cape-coast-tour-vip"
                />

                <Select
                  label="Status"
                  name="isActive"
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                  options={[
                    { value: 'true', label: '✅ Active (Available for bookings & leads)' },
                    { value: 'false', label: '⏸️ Inactive (Hidden from selection)' },
                  ]}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <Textarea
                  label="Description & Inclusions"
                  name="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Details of what is included (e.g. transport, driver, entry fees, hotel breakfast, flight luggage)..."
                />
              </div>

              {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}

              <div className="form-actions" style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : editing ? 'Update Product' : 'Create Product'}
                </Button>
                <Button type="button" variant="secondary" onClick={reset}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setPage(1);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: selectedCategory === 'ALL' ? 700 : 500,
                  background: selectedCategory === 'ALL' ? '#0f172a' : '#f1f5f9',
                  color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All Products
              </button>
              {PRODUCT_CATEGORIES.map((cat) => {
                const isSel = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.value);
                      setPage(1);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: isSel ? 700 : 500,
                      background: isSel ? cat.color : cat.bg,
                      color: isSel ? '#ffffff' : cat.color,
                      border: `1px solid ${cat.border}`,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div style={{ width: 280, maxWidth: '100%' }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Search product name, SKU..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{ height: 36, fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        {error ? <ErrorState message={error} /> : null}

        {data ? (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <Table<ProductItem>
                keyOf={(p) => p.id}
                rows={data.items}
                columns={[
                  {
                    key: 'name',
                    label: 'Product & Service Name',
                    render: (p) => {
                      const meta = getCategoryMeta(p.category);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              background: meta.bg,
                              border: `1px solid ${meta.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {meta.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{p.name}</div>
                            {p.description && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#64748b',
                                  marginTop: 2,
                                  maxWidth: 320,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {p.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'category',
                    label: 'Category',
                    render: (p) => {
                      const meta = getCategoryMeta(p.category);
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </span>
                      );
                    },
                  },
                  {
                    key: 'price',
                    label: 'Standard Price',
                    render: (p) =>
                      p.price != null ? (
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          {p.currency ?? 'GHS'} {Number(p.price).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Custom quote</span>
                      ),
                  },
                  {
                    key: 'isActive',
                    label: 'Status',
                    render: (p) =>
                      p.isActive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: '#f0fdf4',
                            color: '#16a34a',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                          Active
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Inactive
                        </span>
                      ),
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (p) => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          variant="secondary"
                          onClick={() => loadIntoForm(p)}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => remove(p)}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </div>
          </>
        ) : (
          <Spinner />
        )}
      </Card>
    </div>
  );
}
