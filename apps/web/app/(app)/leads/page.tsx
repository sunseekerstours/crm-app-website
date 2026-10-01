'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';

interface Lead {
  id: string;
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
}

const SOURCES = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'PHONE', 'EMAIL', 'OTHER'];
const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

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
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: SOURCES[0],
    tagsInput: '',
    destination: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        source: form.source,
        destination: form.destination || undefined,
        tags: parsedTags.length ? parsedTags : undefined,
      });
      setForm({ firstName: '', lastName: '', email: '', phone: '', source: SOURCES[0], tagsInput: '', destination: '' });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Leads" subtitle="Incoming enquiries, fair prospects, and WordPress web submissions" />

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
          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Destination / Tour" name="destination" placeholder="e.g. Ghana Heritage Circuit" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
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
            <Table
              columns={[
                { key: 'name', label: 'Prospect Name', render: (r) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—' },
                {
                  key: 'contact',
                  label: 'Contact Details',
                  render: (r) => (
                    <div>
                      <div>{r.email || <span style={{ color: '#94a3b8' }}>No email</span>}</div>
                      {r.phone && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📞 {r.phone}</div>}
                    </div>
                  ),
                },
                {
                  key: 'interest',
                  label: 'Interested Tour / Destination',
                  render: (r) => r.destination || r.interestedTour || r.campaign || <span style={{ color: '#94a3b8' }}>—</span>,
                },
                {
                  key: 'tags',
                  label: 'Data Tags',
                  render: (r) => {
                    const tags = r.tags || [];
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
                { key: 'source', label: 'Source', render: (r) => <Badge>{r.source}</Badge> },
                {
                  key: 'stage',
                  label: 'Sales Stage',
                  render: (r) => {
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
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st?.color || '#64748b' }} />
                        {st?.name || r.stage || '—'}
                      </span>
                    );
                  },
                },
              ]}
              rows={data?.items ?? []}
            />
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
