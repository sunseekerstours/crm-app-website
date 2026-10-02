'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import ProductPackageSelect, { ProductItem } from '@/components/ProductPackageSelect';
import { useAuth } from '@/lib/auth';

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
  const { user } = useAuth();
  const isAdmin = Boolean(user?.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(r.toUpperCase())));
  const [viewLead, setViewLead] = useState<Lead | null>(null);
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

          {/* Products / Package Tab Selection with Admin Dropdown & Editable Price */}
          <ProductPackageSelect
            selectedProductName={form.destination}
            priceValue={form.estimatedValue}
            currencyValue={form.currency}
            isSavedRecord={false}
            isAdmin={isAdmin}
            onSelectProduct={(prod, newPrice, newCurr) => {
              setForm((f) => {
                const categoryTag = prod?.category ? prod.category.replace('_', ' ') : '';
                const existingTags = f.tagsInput ? f.tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [];
                if (categoryTag && !existingTags.includes(categoryTag)) {
                  existingTags.push(categoryTag);
                }
                return {
                  ...f,
                  destination: prod?.name || '',
                  estimatedValue: newPrice !== undefined ? newPrice : f.estimatedValue,
                  currency: newCurr || f.currency,
                  tagsInput: existingTags.join(', '),
                };
              });
            }}
            onPriceChange={(val) => setForm((f) => ({ ...f, estimatedValue: val }))}
            onCurrencyChange={(curr) => setForm((f) => ({ ...f, currency: curr }))}
          />

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, display: 'block', whiteSpace: 'nowrap' }}>
                                {leadName}
                              </span>
                              {custId && (
                                <button
                                  type="button"
                                  onClick={() => setViewCustomerId(custId)}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    color: '#0284c7',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: 0,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Linked Customer ↗
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
                        <div style={{ fontSize: 12 }}>
                          {r.phone ? (
                            <a href={`tel:${r.phone}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'block', whiteSpace: 'nowrap' }}>
                              📞 {r.phone}
                            </a>
                          ) : r.email ? (
                            <a href={`mailto:${r.email}`} style={{ color: '#475569', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap' }}>
                              ✉️ {r.email}
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'destination',
                      label: 'Product / Tour',
                      render: (r: Lead) => {
                        const text = r.destination || r.interestedTour || r.campaign;
                        if (!text) return <span style={{ color: '#94a3b8' }}>—</span>;
                        return (
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span>📦</span>
                            <span style={{ whiteSpace: 'nowrap' }}>{text}</span>
                          </span>
                        );
                      },
                    },
                    {
                      key: 'financials',
                      label: 'Expected Value',
                      render: (r: Lead) => (
                        <span style={{ fontWeight: 700, color: '#15803d', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {r.estimatedValue != null ? `${r.currency ?? '$'} ${Number(r.estimatedValue).toLocaleString()}` : '—'}
                        </span>
                      ),
                    },
                    {
                      key: 'stage',
                      label: 'Stage',
                      render: (r: Lead) => {
                        const st = stages.find((s) => s.key === r.stage);
                        return (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '2px 8px',
                              borderRadius: '10px',
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
                      label: 'Actions',
                      render: (r: Lead) => (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setViewLead(r)}
                            style={{
                              background: '#0284c7',
                              border: 'none',
                              color: '#ffffff',
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 6,
                              padding: '5px 10px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              whiteSpace: 'nowrap',
                            }}
                            title="View all details, contact info, customer record, and tags"
                          >
                            👁️ View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Edit
                          </button>
                        </div>
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

      {/* VIEW LEAD DETAILS MODAL */}
      {viewLead && (
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
          onClick={() => setViewLead(null)}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: 800,
                  }}
                >
                  {`${viewLead.firstName?.[0] || ''}${viewLead.lastName?.[0] || ''}`.toUpperCase() || '👤'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {`${viewLead.firstName ?? ''} ${viewLead.lastName ?? ''}`.trim() || 'Prospect'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Lead ID: <span style={{ fontFamily: 'monospace' }}>{viewLead.id.slice(0, 8)}</span> • Source: <strong>{viewLead.source}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewLead(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gap: '14px' }}>
              {/* Contact Information */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  📞 Contact Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Phone:</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                      {viewLead.phone ? (
                        <a href={`tel:${viewLead.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                          {viewLead.phone}
                        </a>
                      ) : '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Email:</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                      {viewLead.email ? (
                        <a href={`mailto:${viewLead.email}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                          {viewLead.email}
                        </a>
                      ) : '—'}
                    </div>
                  </div>
                </div>
                {(viewLead.customerId || viewLead.customer?.id) && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setViewCustomerId(viewLead.customerId || viewLead.customer?.id || '')}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      👁️ View Full Customer Profile &amp; History
                    </button>
                  </div>
                )}
              </div>

              {/* Product & Financials */}
              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '8px' }}>
                  📦 Product &amp; Financials
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#166534' }}>Product / Tour / Destination:</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                      {viewLead.destination || viewLead.interestedTour || 'Custom Package'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#166534' }}>Expected Value:</span>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                      {viewLead.estimatedValue != null
                        ? `${viewLead.currency || 'USD'} ${Number(viewLead.estimatedValue).toLocaleString()}`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Stage */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  🎯 Sales Stage
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {stages.find((s) => s.key === viewLead.stage)?.name || viewLead.stage || 'Initial Inquiry'}
                </div>
              </div>

              {/* All Data Tags */}
              {viewLead.tags && viewLead.tags.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    🏷️ All Associated Data Tags ({viewLead.tags.length})
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {viewLead.tags.map((t) => {
                      const style = getTagBadgeStyle(t);
                      return (
                        <span
                          key={t}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                            fontWeight: 600,
                          }}
                        >
                          {t}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <Button
                variant="secondary"
                onClick={() => setViewLead(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  const leadToEdit = viewLead;
                  setViewLead(null);
                  openEditModal(leadToEdit);
                }}
              >
                ✏️ Edit Lead &amp; Financials
              </Button>
            </div>
          </div>
        </div>
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
              {/* Product / Package with admin lock check */}
              <ProductPackageSelect
                selectedProductName={editLeadForm.destination}
                priceValue={editLeadForm.estimatedValue}
                currencyValue={editLeadForm.currency}
                isSavedRecord={true}
                isAdmin={isAdmin}
                onSelectProduct={(prod, newPrice, newCurr) => {
                  setEditLeadForm((f) => ({
                    ...f,
                    destination: prod?.name || '',
                    estimatedValue: newPrice !== undefined ? newPrice : f.estimatedValue,
                    currency: newCurr || f.currency,
                  }));
                }}
                onPriceChange={(val) => setEditLeadForm((f) => ({ ...f, estimatedValue: val }))}
                onCurrencyChange={(curr) => setEditLeadForm((f) => ({ ...f, currency: curr }))}
              />

              <Input
                label="Destination / Tour Name"
                name="destination"
                value={editLeadForm.destination}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, destination: e.target.value })}
              />

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
