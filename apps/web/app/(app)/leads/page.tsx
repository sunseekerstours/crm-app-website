'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import ProductSearchPicker, { ProductItem } from '@/components/ProductSearchPicker';

interface Lead {
  id: string;
  customerId?: string;
  customer?: { id: string; firstName?: string; lastName?: string; email?: string; phone?: string };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source: string;
  stage: string;
  tags?: string[];
  destination?: string;
  interestedTour?: string;
  campaign?: string;
  estimatedValue?: number;
  currency?: string;
}

const SOURCES = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'PHONE', 'EMAIL', 'OTHER'];
const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

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

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);
  const [stages, setStages] = useState<any[]>([
    { key: 'NEW', name: 'Initial Inquiry', color: '#0284c7' },
    { key: 'CONTACTED', name: 'Contacted & Discovery', color: '#8b5cf6' },
    { key: 'QUALIFIED', name: 'Qualified & Itinerary', color: '#06b6d4' },
    { key: 'PROPOSAL', name: 'Custom Quote Sent', color: '#f59e0b' },
    { key: 'NEGOTIATION', name: 'Negotiation & Fleet Selection', color: '#ec4899' },
    { key: 'WON', name: 'Confirmed Booking (Won)', color: '#10b981' },
    { key: 'LOST', name: 'Lost / Cancelled', color: '#ef4444' },
  ]);

  // Build query
  const q = new URLSearchParams();
  q.set('page', String(page));
  q.set('limit', '10');
  if (search.trim()) q.set('search', search.trim());
  if (selectedTag) q.set('tag', selectedTag);
  if (selectedStage) q.set('stage', selectedStage);

  const { data, loading, error, reload } = useList<Lead>(`/leads?${q.toString()}`, [page, search, selectedTag, selectedStage]);

  useEffect(() => {
    api.get<string[]>('/leads/tags')
      .then((tags) => {
        if (Array.isArray(tags)) setAvailableTags(tags);
      })
      .catch(() => {});

    api.get<any[]>('/deals/stages')
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setStages(res.sort((a: any, b: any) => a.order - b.order));
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    customerId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: SOURCES[0],
    tagsInput: '',
    destination: '',
    estimatedValue: '',
    currency: 'USD',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Lead & Financials Modal State
  const [editModalLead, setEditModalLead] = useState<Lead | null>(null);
  const [editLeadForm, setEditLeadForm] = useState({
    destination: '',
    estimatedValue: '',
    currency: 'USD',
    stage: 'NEW',
    phone: '',
    email: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  function openEditModal(l: Lead) {
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
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const parsedTags = form.tagsInput
        .split(/[,|;]/)
        .map((t) => t.trim())
        .filter(Boolean);

      await api.post('/leads', {
        customerId: form.customerId || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        source: form.source,
        destination: form.destination || undefined,
        interestedTour: form.destination || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        currency: form.currency || 'USD',
        tags: parsedTags.length ? parsedTags : undefined,
      });
      setForm({
        customerId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        source: SOURCES[0],
        tagsInput: '',
        destination: '',
        estimatedValue: '',
        currency: 'USD',
      });
      setSelectedCustomerObj(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Leads" subtitle="Incoming enquiries, fair prospects, and WordPress web submissions with product & financial matching" />

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

      <Card title="New Lead">
        <form onSubmit={create}>
          {/* Customer Link */}
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

          {/* Product / Package of Interest */}
          <div style={{ marginBottom: 18 }}>
            <ProductSearchPicker
              label="📦 Product / Package of Interest (Tours, Fleet, Hotels, Flights)"
              placeholder="Select a product from the catalog..."
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
                } else {
                  setForm((f) => ({ ...f, destination: '' }));
                }
              }}
            />
          </div>

          {/* Form Fields */}
          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Destination / Tour / Product" name="destination" placeholder="e.g. Ghana Heritage Circuit" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            <Input
              label="Data Tags (comma-separated)"
              name="tagsInput"
              placeholder="e.g. Lead-Website-Form, WTM London 2025"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            />
            <Select label="Source" name="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={SOURCES.map((s) => ({ value: s, label: s }))} />
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
              {submitting ? 'Creating…' : 'Create lead'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>Leads {data?.total !== undefined ? `(${data.total})` : ''}</span>
            {selectedTag && (
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0f766e' }}>
                Filtered by tag: <strong>{selectedTag}</strong>
              </span>
            )}
          </div>
        }
      >
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', borderRadius: 8 }}>
                <Table
                  columns={[
                    {
                      key: 'name',
                      label: 'Prospect / Lead',
                      render: (r: Lead) => {
                        const leadName = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—';
                        const custId = r.customerId ?? r.customer?.id;
                        const initials = `${r.firstName?.[0] || ''}${r.lastName?.[0] || ''}`.toUpperCase() || '👤';

                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                  title="View customer profile and history"
                                >
                                  👁️ Customer Profile
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      },
                    },
                    {
                      key: 'contact',
                      label: 'Contact Info',
                      render: (r: Lead) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 190, minWidth: 140 }}>
                          {r.phone ? (
                            <a
                              href={`tel:${r.phone}`}
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
                              title={`Call ${r.phone}`}
                            >
                              <span>📞</span>
                              <span>{r.phone}</span>
                            </a>
                          ) : null}
                          {r.email ? (
                            <a
                              href={`mailto:${r.email}`}
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
                              title={`Email ${r.email}`}
                            >
                              <span>✉️</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</span>
                            </a>
                          ) : null}
                          {!r.phone && !r.email && <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                        </div>
                      ),
                    },
                    {
                      key: 'destination',
                      label: 'Product / Tour / Package',
                      render: (r: Lead) => {
                        const text = r.destination || r.interestedTour || r.campaign;
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
                      key: 'financials',
                      label: 'Expected Financials',
                      render: (r: Lead) => (
                        <div>
                          <div style={{ fontWeight: 800, color: '#15803d', fontSize: 13 }}>
                            {r.estimatedValue != null ? `${r.currency ?? '$'} ${Number(r.estimatedValue).toLocaleString()}` : '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>Expected Value</div>
                        </div>
                      ),
                    },
                    {
                      key: 'tags',
                      label: 'Data Tags',
                      render: (r: Lead) => {
                        const tags = r.tags || [];
                        if (tags.length === 0) return <span style={{ color: '#94a3b8' }}>—</span>;
                        const displayTags = tags.slice(0, 3);
                        const remaining = tags.length - 3;
                        return (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 240 }}>
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
                    { key: 'source', label: 'Source', render: (r: Lead) => <Badge>{r.source}</Badge> },
                    {
                      key: 'stage',
                      label: 'Sales Stage',
                      render: (r: Lead) => {
                        const st = stages.find((s) => s.key === r.stage);
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
                            {st?.name || r.stage || '—'}
                          </span>
                        );
                      },
                    },
                    {
                      key: 'actions',
                      label: 'Actions & Financials',
                      render: (r: Lead) => (
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
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
                      ),
                    },
                  ]}
                  rows={data?.items ?? []}
                />
            </div>
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

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
              maxWidth: '680px',
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
    </div>
  );
}
