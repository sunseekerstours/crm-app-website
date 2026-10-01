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
}

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

          <div style={{ marginBottom: 16 }}>
            <ProductSearchPicker
              label="Select Product / Service of Interest (Optional - Tours, Fleet, Hotel, Flight)"
              placeholder="🔍 Search and attach a product (e.g. Cape Coast Tour, VIP Bus, Labadi Hotel)..."
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
                    label: 'Lead Name & Customer Profile',
                    render: (l) => {
                      const leadName = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || '—';
                      const custId = l.customerId ?? l.customer?.id;
                      const initials = `${l.firstName?.[0] || ''}${l.lastName?.[0] || ''}`.toUpperCase() || '👤';

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, lineHeight: 1.3 }}>{leadName}</span>
                            {custId && (
                              <button
                                type="button"
                                onClick={() => setViewCustomerId(custId)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  padding: '2px 8px',
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
                    label: 'Phone & Email',
                    render: (l) => (
                      <div style={{ whiteSpace: 'nowrap' }}>
                        {l.email && <div>✉️ {l.email}</div>}
                        {l.phone && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            <a href={`tel:${l.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                              📞 {l.phone}
                            </a>
                          </div>
                        )}
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
                    label: 'Actions',
                    render: (l) => (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" onClick={() => loadIntoForm(l)}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => remove(l)}>
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

      {/* CUSTOMER DETAILS MODAL */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </>
  );
}
