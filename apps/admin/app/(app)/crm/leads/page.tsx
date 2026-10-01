'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import ProductSearchPicker, { ProductItem } from '@/components/ProductSearchPicker';

interface LeadItem {
  id: string;
  customerId?: string;
  customer?: { id: string; firstName?: string; lastName?: string; email?: string; phone?: string };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: string;
  tags?: string[];
  destination?: string;
  interestedTour?: string;
  estimatedValue?: number;
  currency?: string;
}

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

interface SalesStageItem {
  id: string;
  key: string;
  name: string;
  color: string;
  order: number;
}

const DEFAULT_STAGES: SalesStageItem[] = [
  { id: 'stage-1', key: 'NEW', name: 'Initial Inquiry', color: '#0284c7', order: 1 },
  { id: 'stage-2', key: 'CONTACTED', name: 'Contacted & Discovery', color: '#8b5cf6', order: 2 },
  { id: 'stage-3', key: 'QUALIFIED', name: 'Qualified & Itinerary', color: '#06b6d4', order: 3 },
  { id: 'stage-4', key: 'PROPOSAL', name: 'Custom Quote Sent', color: '#f59e0b', order: 4 },
  { id: 'stage-5', key: 'NEGOTIATION', name: 'Negotiation & Fleet Selection', color: '#ec4899', order: 5 },
  { id: 'stage-6', key: 'WON', name: 'Confirmed Booking (Won)', color: '#10b981', order: 6 },
  { id: 'stage-7', key: 'LOST', name: 'Lost / Cancelled', color: '#ef4444', order: 7 },
];

const SOURCES = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'PHONE', 'EMAIL', 'OTHER'];

function getTagBadgeStyle(tag: string): { bg: string; color: string; border: string } {
  const t = tag.toLowerCase();
  if (t.includes('wtm') || t.includes('itb') || t.includes('clia') || t.includes('kenya') || t.includes('seatrade') || t.includes('blitz') || t.includes('sales trip') || t.includes('fair')) {
    return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  }
  if (t.includes('lead') || t.includes('website') || t.includes('form') || t.includes('inquiry') || t.includes('enquiry')) {
    return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  }
  if (t.includes('tour') || t.includes('ghana') || t.includes('africa') || t.includes('inbound') || t.includes('outbound')) {
    return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
  }
  if (t.includes('ticket') || t.includes('transport') || t.includes('flight') || t.includes('hotel')) {
    return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
  }
  return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
}

const initialForm = {
  customerId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  source: 'OTHER',
  stage: 'NEW',
  destination: '',
  tagsInput: '',
  estimatedValue: '',
  currency: 'USD',
};

export default function CrmLeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [stages, setStages] = useState<SalesStageItem[]>(DEFAULT_STAGES);
  const [data, setData] = useState<Paginated<LeadItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);

  // Edit Lead & Financials Modal State
  const [editModalLead, setEditModalLead] = useState<LeadItem | null>(null);
  const [editLeadForm, setEditLeadForm] = useState({
    destination: '',
    estimatedValue: '',
    currency: 'USD',
    stage: 'NEW',
    phone: '',
    email: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  function openEditModal(l: LeadItem) {
    setEditModalLead(l);
    setEditLeadForm({
      destination: l.destination || l.interestedTour || '',
      estimatedValue: l.estimatedValue != null ? String(l.estimatedValue) : '',
      currency: l.currency || 'USD',
      stage: l.stage || 'NEW',
      phone: l.phone || '',
      email: l.email || '',
    });
  }

  async function submitEditModal(e: React.FormEvent) {
    e.preventDefault();
    if (!editModalLead) return;
    setEditSubmitting(true);
    try {
      await api.patch(`/leads/${editModalLead.id}`, {
        destination: editLeadForm.destination || undefined,
        interestedTour: editLeadForm.destination || undefined,
        estimatedValue: editLeadForm.estimatedValue ? Number(editLeadForm.estimatedValue) : undefined,
        currency: editLeadForm.currency,
        stage: editLeadForm.stage,
        phone: editLeadForm.phone || undefined,
        email: editLeadForm.email || undefined,
      });
      alert('Lead details and financials updated successfully!');
      setEditModalLead(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setEditSubmitting(false);
    }
  }

  useEffect(() => {
    api.get<SalesStageItem[]>('/deals/stages')
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setStages(res.sort((a, b) => a.order - b.order));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set('limit', '50');
      q.set('page', String(page));
      if (search.trim()) q.set('search', search.trim());
      if (selectedTag) q.set('tag', selectedTag);
      if (selectedStage) q.set('stage', selectedStage);

      const res = await api.get<Paginated<LeadItem>>(`/leads?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    }
  }, [page, search, selectedTag, selectedStage]);

  useEffect(() => {
    api.get<string[]>('/leads/tags')
      .then((tags) => {
        if (Array.isArray(tags)) setAvailableTags(tags);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function loadIntoForm(l: LeadItem) {
    setEditing(l);
    setFormError(null);
    setForm({
      customerId: l.customerId ?? l.customer?.id ?? '',
      firstName: l.firstName ?? '',
      lastName: l.lastName ?? '',
      email: l.email ?? '',
      phone: l.phone ?? '',
      source: l.source ?? 'OTHER',
      stage: l.stage ?? 'NEW',
      destination: l.destination ?? l.interestedTour ?? '',
      tagsInput: (l.tags || []).join(', '),
      estimatedValue: l.estimatedValue != null ? String(l.estimatedValue) : '',
      currency: l.currency ?? 'USD',
    });
    if (l.customer) {
      setSelectedCustomerObj(l.customer);
    } else {
      setSelectedCustomerObj(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(initialForm);
    setSelectedCustomerObj(null);
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
      customerId: form.customerId || undefined,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email,
      phone: form.phone || undefined,
      source: form.source,
      stage: form.stage,
      destination: form.destination || undefined,
      interestedTour: form.destination || undefined,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      currency: form.currency || 'USD',
      tags: parsedTags.length ? parsedTags : undefined,
    };

    try {
      if (editing) {
        await api.patch(`/leads/${editing.id}`, body);
      } else {
        await api.post('/leads', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(l: LeadItem) {
    const name = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || l.email || 'this lead';
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/leads/${l.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={editing ? 'Edit lead details and data tags' : 'Manage your sales leads and trade fair prospects'}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              disabled={isExportingAll}
              onClick={async () => {
                setIsExportingAll(true);
                const extra: Record<string, string> = {};
                if (search.trim()) extra.search = search.trim();
                if (selectedTag) extra.tag = selectedTag;
                if (selectedStage) extra.stage = selectedStage;
                await exportAllFromApi(
                  '/leads',
                  'sunseekers_all_leads',
                  [
                    { key: 'firstName', label: 'First Name' },
                    { key: 'lastName', label: 'Last Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'stage', label: 'Stage' },
                    { key: 'source', label: 'Source' },
                    { key: 'destination', label: 'Destination' },
                    { key: 'interestedTour', label: 'Interested Tour' },
                    { key: 'tags', label: 'Tags', format: (l) => (l.tags || []).join('; ') },
                  ],
                  extra
                );
                setIsExportingAll(false);
              }}
            >
              {isExportingAll ? '⏳ Exporting All Leads…' : '📥 Export All CSV'}
            </Button>
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
              New lead
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 220px', minWidth: 180 }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search leads by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
            />
          </div>

          <div style={{ flex: '0 1 220px', minWidth: 180 }}>
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

          <div style={{ flex: '0 1 200px', minWidth: 160 }}>
            <select
              className="input"
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
            >
              <option value="">Status / Sales Stage (All)</option>
              {stages.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.name} ({st.key})
                </option>
              ))}
            </select>
          </div>

          {(search || selectedTag || selectedStage) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedTag('');
                setSelectedStage('');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          )}

          <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            {data?.total !== undefined ? `${data.total} total leads` : ''}
          </div>
        </div>
      </Card>

      <Card title={editing ? `Edit: ${editing.firstName ?? ''} ${editing.lastName ?? ''}` : 'New lead'}>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <CustomerSearchPicker
              label="Link Existing Customer (Auto-fills details, or leave empty for new prospect)"
              value={form.customerId}
              selectedCustomer={selectedCustomerObj}
              onChange={(custId, cust) => {
                setForm((f) => ({
                  ...f,
                  customerId: custId,
                  firstName: cust?.firstName ?? f.firstName,
                  lastName: cust?.lastName ?? f.lastName,
                  email: cust?.email ?? f.email,
                  phone: cust?.phone ?? f.phone,
                }));
                setSelectedCustomerObj(cust);
              }}
              onViewDetails={(custId) => setViewCustomerId(custId)}
            />
          </div>

          {/* Product Selection with Category Tabs */}
          <div
            style={{
              marginBottom: 18,
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>📦</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                  Select Available Product / Package of Interest (Tours, Fleet, Hotels, Flights, Custom)
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Selecting a product auto-sets destination, tags &amp; expected financials
              </span>
            </div>
            <ProductSearchPicker
              placeholder="🔍 Search available products or click a category tab above..."
              selectedProductName={form.destination}
              onSelect={(prod) => {
                if (prod) {
                  setForm((f) => {
                    const categoryTag = prod.category ? prod.category.replace('_', ' ') : '';
                    const existingTags = f.tagsInput ? f.tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [];
                    if (categoryTag && !existingTags.includes(categoryTag)) {
                      existingTags.push(categoryTag);
                    }
                    return {
                      ...f,
                      destination: prod.name,
                      estimatedValue: prod.price != null ? String(prod.price) : f.estimatedValue,
                      currency: prod.currency || f.currency,
                      tagsInput: existingTags.join(', '),
                    };
                  });
                }
              }}
            />
          </div>

          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Destination / Package / Tour" name="destination" placeholder="e.g. Ghana Heritage Circuit" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            <Input
              label="Data Tags (comma-separated)"
              name="tagsInput"
              placeholder="e.g. Lead-Website-Form, WTM London 2025"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            />
            <Select label="Source" name="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={SOURCES.map((s) => ({ value: s, label: s.replace('_', ' ') }))} />
            <Select label="Sales Stage" name="stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} options={stages.map((s) => ({ value: s.key, label: s.name }))} />
          </div>

          {/* FINANCIALS & EXPECTED AMOUNT SECTION */}
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <span style={{ fontWeight: 800, color: '#166534', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Financials &amp; Expected Deal Value
                </span>
              </div>
              {form.estimatedValue && (
                <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                  Expected: {form.currency} {Number(form.estimatedValue).toLocaleString()}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Input
                label="Expected Financial Amount ($/₵)"
                name="estimatedValue"
                type="number"
                placeholder="e.g. 1500"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              />

              <Select
                label="Currency"
                name="currency"
                value={form.currency}
                options={CURRENCIES}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>ℹ️</span>
              <span>Determined from selected product catalog. You can edit this financial value where necessary (negotiated quotes, custom rate).</span>
            </div>
          </div>

          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create lead'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', borderRadius: 8 }}>
            <div style={{ minWidth: 1050 }}>
              <Table<LeadItem>
                keyOf={(l) => l.id}
                rows={data.items}
                columns={[
                  {
                    key: 'name',
                    label: 'Prospect / Lead',
                    render: (l) => {
                      const leadName = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || '—';
                      const custId = l.customerId ?? l.customer?.id;
                      const initials = `${l.firstName?.[0] || ''}${l.lastName?.[0] || ''}`.toUpperCase() || '👤';

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 200 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflow: 'hidden' }}>
                            <span
                              style={{
                                fontWeight: 700,
                                color: '#0f172a',
                                fontSize: 13,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={leadName}
                            >
                              {leadName}
                            </span>
                            {custId && (
                              <button
                                type="button"
                                onClick={() => setViewCustomerId(custId)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  padding: '1px 6px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  width: 'fit-content',
                                }}
                                title="View customer profile & CRM history"
                              >
                                👁️ View Details
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'phone',
                    label: 'Contact Info',
                    render: (l) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 190, minWidth: 140 }}>
                        {l.phone ? (
                          <a
                            href={`tel:${l.phone}`}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#0284c7',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title={`Call ${l.phone}`}
                          >
                            <span>📞</span>
                            <span>{l.phone}</span>
                          </a>
                        ) : null}
                        {l.email ? (
                          <a
                            href={`mailto:${l.email}`}
                            style={{
                              fontSize: 11,
                              color: '#475569',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title={`Email ${l.email}`}
                          >
                            <span>✉️</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email}</span>
                          </a>
                        ) : null}
                        {!l.phone && !l.email && <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                      </div>
                    ),
                  },
                  {
                    key: 'interest',
                    label: 'Destination / Tour / Product',
                    render: (l) => {
                      const text = l.destination || l.interestedTour;
                      if (!text) return <span style={{ color: '#94a3b8' }}>—</span>;
                      let icon = '🎯';
                      const lower = text.toLowerCase();
                      if (lower.includes('tour') || lower.includes('ghana') || lower.includes('cape coast') || lower.includes('castle')) icon = '🌍';
                      else if (lower.includes('fleet') || lower.includes('bus') || lower.includes('car') || lower.includes('van') || lower.includes('rental')) icon = '🚐';
                      else if (lower.includes('hotel') || lower.includes('resort') || lower.includes('suite') || lower.includes('lodge')) icon = '🏨';
                      else if (lower.includes('flight') || lower.includes('airline') || lower.includes('air') || lower.includes('ticket')) icon = '✈️';
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span>{icon}</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{text}</span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'tags',
                    label: 'Data Tags',
                    render: (l) => {
                      const tags = l.tags || [];
                      if (tags.length === 0) return <span style={{ color: '#94a3b8' }}>—</span>;
                      const displayTags = tags.slice(0, 3);
                      const remaining = tags.length - 3;
                      return (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 260 }}>
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
                  {
                    key: 'financials',
                    label: 'Expected Financials',
                    render: (l) => (
                      <div>
                        <div style={{ fontWeight: 800, color: '#15803d', fontSize: 13 }}>
                          {l.estimatedValue != null ? `${l.currency ?? '$'} ${Number(l.estimatedValue).toLocaleString()}` : '—'}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Expected Value</div>
                      </div>
                    ),
                  },
                  {
                    key: 'stage',
                    label: 'Sales Stage',
                    render: (l) => {
                      const st = stages.find((s) => s.key === l.stage);
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: st?.color ? `${st.color}15` : '#f1f5f9',
                            color: st?.color || '#334155',
                            border: `1px solid ${st?.color ? `${st.color}40` : '#cbd5e1'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: st?.color || '#64748b' }} />
                          {st?.name || l.stage || '—'}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    label: 'Actions & Financials',
                    render: (l) => (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(l)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Edit Financials
                        </button>
                        <Button variant="secondary" onClick={() => loadIntoForm(l)} style={{ padding: '4px 8px', fontSize: 11 }}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => remove(l)} style={{ padding: '4px 8px', fontSize: 11 }}>
                          Delete
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <Spinner />
      )}

      {/* EDIT LEAD & FINANCIALS MODAL */}
      {editModalLead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Edit Lead Financials &amp; Product
                </h3>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Lead: <strong>{`${editModalLead.firstName ?? ''} ${editModalLead.lastName ?? ''}`.trim() || 'Prospect'}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalLead(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitEditModal} style={{ display: 'grid', gap: '14px' }}>
              <ProductSearchPicker
                label="Product / Package of Interest"
                selectedProductName={editLeadForm.destination}
                onSelect={(prod) => {
                  if (prod) {
                    setEditLeadForm((f) => ({
                      ...f,
                      destination: prod.name,
                      estimatedValue: prod.price != null ? String(prod.price) : f.estimatedValue,
                      currency: prod.currency || f.currency,
                    }));
                  }
                }}
              />

              <Input
                label="Destination / Tour Name"
                name="destination"
                value={editLeadForm.destination}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, destination: e.target.value })}
              />

              {/* FINANCIALS SECTION IN MODAL */}
              <div
                style={{
                  padding: '12px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontWeight: 800, color: '#166534', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>
                  💵 Financials / Expected Deal Value
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <Input
                    label="Expected Value *"
                    name="estimatedValue"
                    type="number"
                    value={editLeadForm.estimatedValue}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, estimatedValue: e.target.value })}
                  />
                  <Select
                    label="Currency"
                    name="currency"
                    value={editLeadForm.currency}
                    options={CURRENCIES}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, currency: e.target.value })}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 6 }}>
                  You can adjust or negotiate this financial amount where necessary.
                </div>
              </div>

              <Select
                label="Sales Stage"
                name="stage"
                value={editLeadForm.stage}
                options={stages.map((st) => ({ value: st.key, label: st.name }))}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, stage: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Input
                  label="Phone"
                  name="phone"
                  value={editLeadForm.phone}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={editLeadForm.email}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <Button type="submit" disabled={editSubmitting} style={{ flex: 1 }}>
                  {editSubmitting ? 'Saving…' : 'Save Lead & Financials'}
                </Button>
                <Button variant="secondary" onClick={() => setEditModalLead(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAILS MODAL */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </>
  );
}
