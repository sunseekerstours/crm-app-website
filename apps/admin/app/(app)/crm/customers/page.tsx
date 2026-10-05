'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Paginated } from '@/lib/api';
import { exportToCSV, exportAllFromApi } from '@/lib/export';
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
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import { formatDisplayPhone } from '@/lib/phone';

interface CustomerItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  status?: string;
  tags?: string[];
  company?: { id: string; name: string };
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

interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: { firstName?: string; lastName?: string } | null;
}

function getTagBadgeStyle(tag: string): { bg: string; color: string; border: string } {
  const t = tag.toLowerCase();
  if (t === 'fleet' || t.includes('fleet')) {
    return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }; // Emerald for fleet clients
  }
  if (t.includes('wtm') || t.includes('itb') || t.includes('clia') || t.includes('kenya') || t.includes('seatrade') || t.includes('blitz') || t.includes('sales trip') || t.includes('fair')) {
    return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }; // Blue for trade fairs
  }
  if (t.includes('lead') || t.includes('website') || t.includes('form') || t.includes('inquiry') || t.includes('enquiry')) {
    return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }; // Emerald for inbound web/forms
  }
  if (t.includes('tour') || t.includes('ghana') || t.includes('africa') || t.includes('inbound') || t.includes('outbound')) {
    return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' }; // Purple for tours & destinations
  }
  if (t.includes('ticket') || t.includes('transport') || t.includes('flight') || t.includes('hotel')) {
    return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' }; // Amber for logistics & travel services
  }
  return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }; // Slate gray default
}

const STATUSES = ['ACTIVE', 'INACTIVE', 'LEAD'];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  status: 'ACTIVE',
  tagsInput: '',
  productIds: [] as string[],
  linkedLeadId: '',
  linkedDealId: '',
  notes: '',
  scheduleFollowUp: false,
  followUpReminderDate: '',
  followUpReminderTitle: '',
  followUpReminderPriority: 'HIGH',
};

export default function CrmCustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [data, setData] = useState<Paginated<CustomerItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerItem | null>(null);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [exportingAll, setExportingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<LinkOption[]>([]);
  const [deals, setDeals] = useState<LinkOption[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

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
      const q = new URLSearchParams();
      q.set('limit', '50');
      q.set('page', String(page));
      if (search.trim()) q.set('search', search.trim());
      if (selectedTag) q.set('tag', selectedTag);

      const res = await api.get<Paginated<CustomerItem>>(`/customers?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    }
  }, [page, search, selectedTag]);

  // Load available tags
  useEffect(() => {
    api.get<string[]>('/customers/tags')
      .then((tags) => {
        if (Array.isArray(tags)) setAvailableTags(tags);
      })
      .catch(() => {});
  }, []);

  const loadNotes = useCallback(async (customerId: string) => {
    try {
      const res = await api.get<Paginated<NoteItem>>(`/notes?customerId=${customerId}`);
      setNotes(res.items ?? []);
    } catch {
      setNotes([]);
    }
  }, []);

  async function addNote(customerId: string) {
    const content = noteText.trim();
    if (!content) return;
    setAddingNote(true);
    try {
      await api.post(`/customers/${customerId}/notes`, { content });
      setNoteText('');
      await loadNotes(customerId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  }

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
      tagsInput: (c.tags || []).join(', '),
      productIds: (c.products ?? []).map((p) => p.id),
      linkedLeadId: '',
      linkedDealId: '',
      notes: '',
      scheduleFollowUp: false,
      followUpReminderDate: '',
      followUpReminderTitle: '',
      followUpReminderPriority: 'HIGH',
    });
    void loadNotes(c.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setNotes([]);
    setNoteText('');
    setForm(initialForm);
    setFormError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const parsedTags = form.tagsInput
      .split(/[,|;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const body: Record<string, any> = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      country: form.country || undefined,
      status: form.status,
      tags: parsedTags.length ? parsedTags : undefined,
      productIds: form.productIds.length ? form.productIds : undefined,
      linkedLeadId: form.linkedLeadId || undefined,
      linkedDealId: form.linkedDealId || undefined,
      notes: form.notes || undefined,
    };

    if (form.scheduleFollowUp && form.followUpReminderDate) {
      body.followUpReminderDate = new Date(form.followUpReminderDate).toISOString();
      body.followUpReminderTitle = form.followUpReminderTitle || `Follow up with ${form.firstName} ${form.lastName}`;
      body.followUpReminderPriority = form.followUpReminderPriority;
    }

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
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles, Jetpack CRM data tags, preferences, and products"
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href={selectedTag ? `/crm/campaigns?tag=${selectedTag}` : '/crm/campaigns'}>
              <Button variant="secondary">
                📢 Broadcast Bulk Email / SMS
              </Button>
            </Link>
            <Button
              variant="secondary"
              disabled={exportingAll}
              onClick={async () => {
                setExportingAll(true);
                const extra: Record<string, string> = {};
                if (selectedTag) extra.tag = selectedTag;
                if (search.trim()) extra.search = search.trim();
                await exportAllFromApi(
                  '/customers',
                  `sunseekers_all_customers${selectedTag ? `_${selectedTag}` : ''}`,
                  [
                    { key: 'firstName', label: 'First Name / Company' },
                    { key: 'lastName', label: 'Last Name' },
                    { key: 'email', label: 'Email Address', format: (c) => c.email || '' },
                    { key: 'phone', label: 'Phone Number', format: (c) => c.phone || '0200000000' },
                    { key: 'tags', label: 'Tags', format: (c) => (c.tags || []).join('; ') },
                    { key: 'status', label: 'Status' },
                    { key: 'country', label: 'Country' },
                    { key: 'company', label: 'Company Organization', format: (c) => c.company?.name || '' },
                  ],
                  extra
                );
                setExportingAll(false);
              }}
            >
              {exportingAll ? '⏳ Exporting All Customers…' : '📥 Export All CSV'}
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search customer by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
            />
          </div>

          <div style={{ flex: '0 1 260px', minWidth: 200 }}>
            <select
              className="input"
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
            >
              <option value="">🏷️ Filter by Tag (All Tags)</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedTag) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedTag('');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          )}

          <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            {data?.total !== undefined ? `${data.total} total matching customers` : ''}
          </div>
        </div>
      </Card>

      <Card title={editing ? `Edit Customer (${editing.firstName ?? ''} ${editing.lastName ?? ''})` : 'New Customer'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Country" name="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Input
              label="Data Tags (comma-separated)"
              name="tagsInput"
              placeholder="e.g. WTM London 2025, Lead-Website-Form, Tour-Ghana"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            />
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

          {/* Initial Customer Notes / Special Requirements */}
          <div style={{ marginTop: 16 }}>
            <label className="field">
              <span className="field-label">Customer Notes &amp; Special Preferences</span>
              <textarea
                className="input"
                rows={3}
                placeholder="Add background notes, travel preferences, dietary requests, or referral details..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </label>
          </div>

          {/* Set Follow-Up Reminder */}
          <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={form.scheduleFollowUp}
                onChange={(e) => setForm({ ...form, scheduleFollowUp: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--brand, #0f766e)' }}
              />
              <span>⏰ Schedule Follow-up Reminder</span>
            </label>

            {form.scheduleFollowUp && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
                <Input
                  label="Follow-up Date & Time"
                  name="followUpReminderDate"
                  type="datetime-local"
                  required={form.scheduleFollowUp}
                  value={form.followUpReminderDate}
                  onChange={(e) => setForm({ ...form, followUpReminderDate: e.target.value })}
                />
                <Input
                  label="Reminder Reason / Task Title"
                  name="followUpReminderTitle"
                  placeholder="e.g. Call to discuss itinerary"
                  value={form.followUpReminderTitle}
                  onChange={(e) => setForm({ ...form, followUpReminderTitle: e.target.value })}
                />
                <label className="field">
                  <span className="field-label">Priority</span>
                  <select
                    className="input"
                    value={form.followUpReminderPriority}
                    onChange={(e) => setForm({ ...form, followUpReminderPriority: e.target.value })}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create customer'}
            </Button>
            {editing && (
              <Button variant="secondary" onClick={reset}>
                Cancel Edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      {editing ? (
        <Card title="Notes" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              className="input"
              rows={2}
              placeholder="Add a note about this customer…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ flex: 1, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <Button onClick={() => addNote(editing.id)} disabled={addingNote || !noteText.trim()}>
                {addingNote ? 'Adding…' : 'Add note'}
              </Button>
            </div>
          </div>
          {notes.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 16 }}>
              No notes yet for this customer.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map((n) => (
                <li key={n.id} className="panel" style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                    {n.createdBy && `${n.createdBy.firstName ?? ''} ${n.createdBy.lastName ?? ''}`.trim()
                      ? `${n.createdBy.firstName ?? ''} ${n.createdBy.lastName ?? ''}`.trim()
                      : 'User'}
                    {n.createdAt ? ` · ${new Date(n.createdAt).toLocaleString()}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <div style={{ marginTop: 16 }}>
        {error ? <ErrorState message={error} /> : null}
        {data ? (
          <>
            <Table<CustomerItem>
              keyOf={(c) => c.id}
              rows={data.items}
              columns={[
                {
                  key: 'name',
                  label: 'Name & Organization',
                  render: (c) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—'}
                      </div>
                      {c.company?.name && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          🏢 {c.company.name}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'contact',
                  label: 'Contact',
                  render: (c) => (
                    <div>
                      <div>{c.email || <span style={{ color: '#94a3b8' }}>—</span>}</div>
                      {c.phone && <div style={{ fontSize: 12, color: '#64748b' }}>📞 {formatDisplayPhone(c.phone)}</div>}
                    </div>
                  ),
                },
                { key: 'country', label: 'Country', render: (c) => c.country ?? '—' },
                {
                  key: 'tags',
                  label: 'Data Tags',
                  render: (c) => {
                    const tags = c.tags || [];
                    if (tags.length === 0) return <span style={{ color: '#94a3b8' }}>—</span>;
                    const displayTags = tags.slice(0, 3);
                    const remaining = tags.length - 3;
                    return (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 280 }}>
                        {displayTags.map((t) => {
                          const style = getTagBadgeStyle(t);
                          return (
                            <span
                              key={t}
                              onClick={() => setSelectedTag(t)}
                              title={`Filter by ${t}`}
                              style={{
                                display: 'inline-block',
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: style.bg,
                                color: style.color,
                                border: `1px solid ${style.border}`,
                                fontWeight: 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t}
                            </span>
                          );
                        })}
                        {remaining > 0 && (
                          <span
                            title={tags.slice(3).join(', ')}
                            style={{
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 12,
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              fontWeight: 500,
                            }}
                          >
                            +{remaining} more
                          </span>
                        )}
                      </div>
                    );
                  },
                },
                { key: 'status', label: 'Status', render: (c) => <Badge>{c.status ?? '—'}</Badge> },
                {
                  key: 'products',
                  label: 'Products',
                  render: (c) => (c.products && c.products.length ? c.products.map((p) => p.name).join(', ') : '—'),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (c) => (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setViewCustomerId(c.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="View complete customer profile and history"
                      >
                        👁️ View
                      </button>
                      <Button variant="secondary" onClick={() => loadIntoForm(c)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                        ✏️ Edit
                      </Button>
                      <Button variant="danger" onClick={() => remove(c)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
            <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
          </>
        ) : (
          <Spinner />
        )}
      </div>

      {/* Customer Full Details Modal */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  );
}
