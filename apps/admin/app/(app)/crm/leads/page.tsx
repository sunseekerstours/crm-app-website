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

interface LeadItem {
  id: string;
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

const initialForm = {
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
  const [data, setData] = useState<Paginated<LeadItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      firstName: l.firstName ?? '',
      lastName: l.lastName ?? '',
      email: l.email ?? '',
      phone: l.phone ?? '',
      source: l.source ?? 'OTHER',
      stage: l.stage ?? 'NEW',
      destination: l.destination ?? l.interestedTour ?? '',
      tagsInput: (l.tags || []).join(', '),
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

    const parsedTags = form.tagsInput
      .split(/[,|;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const body: Record<string, any> = {
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

          <div style={{ flex: '0 1 180px', minWidth: 140 }}>
            <select
              className="input"
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
            >
              <option value="">Status / Stage (All)</option>
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
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
          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Destination / Package" name="destination" placeholder="e.g. Ghana Heritage Circuit" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            <Input
              label="Data Tags (comma-separated)"
              name="tagsInput"
              placeholder="e.g. Lead-Website-Form, WTM London 2025"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            />
            <Select label="Source" name="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={SOURCES.map((s) => ({ value: s, label: s.replace('_', ' ') }))} />
            <Select label="Stage" name="stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} options={STAGES.map((s) => ({ value: s, label: s }))} />
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
          <Table<LeadItem>
            keyOf={(l) => l.id}
            rows={data.items}
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (l) => `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || '—',
              },
              { key: 'email', label: 'Email', render: (l) => l.email ?? '—' },
              { key: 'phone', label: 'Phone', render: (l) => l.phone ?? '—' },
              {
                key: 'interest',
                label: 'Destination / Tour',
                render: (l) => l.destination || l.interestedTour || '—',
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
              { key: 'source', label: 'Source', render: (l) => <Badge>{l.source?.replace('_', ' ') ?? '—'}</Badge> },
              { key: 'stage', label: 'Stage', render: (l) => <Badge>{l.stage ?? '—'}</Badge> },
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
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <Spinner />
      )}
    </>
  );
}
