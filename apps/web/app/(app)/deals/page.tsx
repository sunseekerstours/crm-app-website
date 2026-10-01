'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { api, Paginated } from '@/lib/api';

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface RecordedNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: {
    firstName?: string;
    lastName?: string;
  };
}

interface DealItem {
  id: string;
  name?: string;
  customerId?: string;
  customer?: CustomerOption;
  value?: number | string;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  tour?: string;
  destination?: string;
  recordedNotes?: RecordedNote[];
}

export interface SalesStageItem {
  id: string;
  key: string;
  name: string;
  color: string;
  order: number;
  description?: string;
}

const DEFAULT_STAGES: SalesStageItem[] = [
  { id: 'stage-1', key: 'NEW', name: 'Initial Inquiry', color: '#0284c7', order: 1 },
  { id: 'stage-2', key: 'CONTACTED', name: 'Contacted & Discovery', color: '#8b5cf6', order: 2 },
  { id: 'stage-3', key: 'QUALIFIED', name: 'Qualified & Itinerary', color: '#06b6d4', order: 3 },
  { id: 'stage-4', key: 'PROPOSAL', name: 'Custom Quote Sent', color: '#f59e0b', order: 4 },
  { id: 'stage-5', key: 'NEGOTIATION', name: 'Negotiation & Fleet Selection', color: '#ec4899', order: 5 },
  { id: 'stage-6', key: 'DEPOSIT', name: 'Awaiting Deposit', color: '#d97706', order: 6 },
  { id: 'stage-7', key: 'WON', name: 'Confirmed Booking (Won)', color: '#10b981', order: 7 },
  { id: 'stage-8', key: 'LOST', name: 'Lost / Cancelled', color: '#ef4444', order: 8 },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export default function StaffSalesStagesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Paginated<DealItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<SalesStageItem[]>(DEFAULT_STAGES);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [filterStage, setFilterStage] = useState<string>('ALL');

  // Note Modal State
  const [noteDeal, setNoteDeal] = useState<DealItem | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // New Deal Form State
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState({ name: '', value: '', currency: 'USD', stage: 'NEW', tour: '', destination: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadStages = useCallback(async () => {
    try {
      const res = await api.get<SalesStageItem[]>('/deals/stages');
      if (Array.isArray(res) && res.length > 0) {
        setStages(res.sort((a, b) => a.order - b.order));
      }
    } catch {
      setStages(DEFAULT_STAGES);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '100', page: String(page) });
      if (search) q.set('search', search);
      const res = await api.get<Paginated<DealItem>>(`/deals?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadStages();
  }, [loadStages]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMoveStage = async (dealId: string, newStage: string) => {
    try {
      await api.patch(`/deals/${dealId}`, { stage: newStage });
      void load();
    } catch (err: any) {
      alert(err?.message || 'Failed to update stage');
    }
  };

  const handleSaveNote = async () => {
    if (!noteDeal || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/deals/${noteDeal.id}/notes`, { content: noteContent.trim() });
      setNoteDeal(null);
      setNoteContent('');
      void load();
    } catch (err: any) {
      alert(err?.message || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/deals', {
        name: form.name.trim(),
        value: form.value ? Number(form.value) : undefined,
        currency: form.currency,
        stage: form.stage,
        tour: form.tour || undefined,
        destination: form.destination || undefined,
      });
      setShowNewModal(false);
      setForm({ name: '', value: '', currency: 'USD', stage: 'NEW', tour: '', destination: '' });
      void load();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create opportunity');
    } finally {
      setSubmitting(false);
    }
  }

  // Metrics
  const allItems = data?.items ?? [];
  const filteredItems = filterStage === 'ALL' ? allItems : allItems.filter((i) => i.stage === filterStage);
  const totalPipelineValue = allItems.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  const stageMap: Record<string, { count: number; totalVal: number }> = {};
  for (const s of stages) {
    stageMap[s.key] = { count: 0, totalVal: 0 };
  }
  for (const item of allItems) {
    const k = item.stage || 'NEW';
    if (!stageMap[k]) stageMap[k] = { count: 0, totalVal: 0 };
    stageMap[k].count += 1;
    stageMap[k].totalVal += Number(item.value) || 0;
  }

  const getStageConfig = (key?: string) => {
    return stages.find((s) => s.key === key) || { name: key || 'Stage', color: '#64748b' };
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeader
        title="💼 Sales Stages (Deals & Pipeline)"
        subtitle="Manage and advance customer inquiries through the company's official sales stages."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="primary" onClick={() => setShowNewModal(true)}>
              ➕ New Opportunity
            </Button>
          </div>
        }
      />

      {/* Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <Card style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Active Opportunities
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>
            {allItems.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#38bdf8' }}>in pipeline</span>
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0f2fe', textTransform: 'uppercase' }}>
            Total Pipeline Value
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>
            ${totalPipelineValue.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500, color: '#bae6fd' }}>USD</span>
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#d1fae5', textTransform: 'uppercase' }}>
            Won Bookings
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px' }}>
            ${(stageMap['WON']?.totalVal || 0).toLocaleString()}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#a7f3d0' }}>({stageMap['WON']?.count || 0})</span>
          </div>
        </Card>
      </div>

      {/* Filter and View Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Filter Stage:</span>
          <button
            type="button"
            onClick={() => setFilterStage('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: filterStage === 'ALL' ? '2px solid #0f172a' : '1px solid #cbd5e1',
              background: filterStage === 'ALL' ? '#0f172a' : '#f8fafc',
              color: filterStage === 'ALL' ? '#ffffff' : '#475569',
            }}
          >
            All Stages ({allItems.length})
          </button>

          {stages.map((stg) => {
            const info = stageMap[stg.key] || { count: 0, totalVal: 0 };
            const active = filterStage === stg.key;
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setFilterStage(stg.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? `2px solid ${stg.color}` : '1px solid #cbd5e1',
                  background: active ? stg.color : '#ffffff',
                  color: active ? '#ffffff' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: active ? '#ffffff' : stg.color }} />
                <span>{stg.name}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: active ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                  }}
                >
                  {info.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: viewMode === 'kanban' ? '1px solid #0284c7' : '1px solid #cbd5e1',
              background: viewMode === 'kanban' ? '#e0f2fe' : '#ffffff',
              color: viewMode === 'kanban' ? '#0369a1' : '#64748b',
            }}
          >
            📋 Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: viewMode === 'table' ? '1px solid #0284c7' : '1px solid #cbd5e1',
              background: viewMode === 'table' ? '#e0f2fe' : '#ffffff',
              color: viewMode === 'table' ? '#0369a1' : '#64748b',
            }}
          >
            📊 Table
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${stages.length}, minmax(280px, 1fr))`,
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '20px',
            alignItems: 'start',
          }}
        >
          {stages.map((stg) => {
            const stgItems = allItems.filter((i) => (i.stage || 'NEW') === stg.key);
            const stgVal = stgItems.reduce((acc, c) => acc + (Number(c.value) || 0), 0);

            return (
              <div
                key={stg.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '800px',
                  minWidth: '280px',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderTop: `4px solid ${stg.color}`,
                    borderBottom: '1px solid #e2e8f0',
                    background: '#ffffff',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{stg.name}</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>${stgVal.toLocaleString()} USD</span>
                  </div>
                  <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                    {stgItems.length}
                  </span>
                </div>

                <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stgItems.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                      No clients in this stage
                    </div>
                  ) : (
                    stgItems.map((item) => {
                      const custName = item.customer ? `${item.customer.firstName ?? ''} ${item.customer.lastName ?? ''}`.trim() : 'Unassigned';
                      const latestNote = item.recordedNotes?.[0];

                      return (
                        <Card key={item.id} style={{ padding: '14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7' }}>
                              {item.value != null ? `$${Number(item.value).toLocaleString()}` : '—'}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                            👤 <strong>{custName}</strong>
                            {item.customer?.phone && <span style={{ display: 'block', color: '#64748b' }}>📞 {item.customer.phone}</span>}
                            {item.tour && <span style={{ display: 'block', color: '#0284c7', fontWeight: 600 }}>🎒 {item.tour}</span>}
                          </div>

                          {latestNote && (
                            <div style={{ background: '#f8fafc', borderLeft: '3px solid #0284c7', padding: '6px 8px', borderRadius: '4px', fontSize: '11px', color: '#334155', marginBottom: '8px' }}>
                              <strong>Note:</strong> {latestNote.content}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setNoteDeal(item);
                                setNoteContent('');
                              }}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              📝 Add Note
                            </button>

                            <select
                              value={item.stage || 'NEW'}
                              onChange={(e) => handleMoveStage(item.id, e.target.value)}
                              style={{
                                fontSize: '11px',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                              }}
                            >
                              {stages.map((st) => (
                                <option key={st.key} value={st.key}>
                                  ➔ {st.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card>
          <Table
            columns={[
              {
                key: 'name',
                label: 'Opportunity',
                render: (d: DealItem) => (
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{d.name}</span>
                    {d.tour && <span style={{ display: 'block', fontSize: '12px', color: '#0284c7' }}>🎒 {d.tour}</span>}
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Customer',
                render: (d: DealItem) => (
                  <div>
                    <span style={{ fontWeight: 600 }}>{d.customer ? `${d.customer.firstName ?? ''} ${d.customer.lastName ?? ''}`.trim() : '—'}</span>
                    {d.customer?.phone && <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>📞 {d.customer.phone}</span>}
                  </div>
                ),
              },
              {
                key: 'stage',
                label: 'Sales Stage',
                render: (d: DealItem) => {
                  const currentStg = getStageConfig(d.stage);
                  return (
                    <select
                      value={d.stage || 'NEW'}
                      onChange={(e) => handleMoveStage(d.id, e.target.value)}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${currentStg.color}`,
                        background: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      {stages.map((st) => (
                        <option key={st.key} value={st.key}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  );
                },
              },
              {
                key: 'value',
                label: 'Value',
                render: (d: DealItem) => (
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>
                    {d.value != null ? `$${Number(d.value).toLocaleString()}` : '—'}
                  </span>
                ),
              },
              {
                key: 'notes',
                label: 'Latest Note',
                render: (d: DealItem) => (
                  <div>
                    <span style={{ fontSize: '12px', color: '#475569' }}>{d.recordedNotes?.[0]?.content || '—'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNoteDeal(d);
                        setNoteContent('');
                      }}
                      style={{
                        display: 'block',
                        marginTop: '4px',
                        background: 'none',
                        border: 'none',
                        color: '#059669',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      + Add Note
                    </button>
                  </div>
                ),
              },
            ]}
            rows={filteredItems}
          />
        </Card>
      )}

      {/* IN-STAGE NOTE MODAL */}
      {noteDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '480px', width: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                📝 Add Note: {noteDeal.name}
              </h4>
              <button type="button" onClick={() => setNoteDeal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Note Details (Saved to Customer History)
              </label>
              <textarea
                rows={4}
                placeholder="e.g. Spoke with traveler on WhatsApp. Prefers 4x4 Prado, vegetarian meals for 2, arriving 8 PM."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
                autoFocus
              />
            </div>

            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setNoteDeal(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveNote} disabled={savingNote || !noteContent.trim()}>
                {savingNote ? 'Saving…' : '💾 Save Note'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* NEW OPPORTUNITY MODAL */}
      {showNewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>➕ Create New Opportunity</h3>
            {formError && <p style={{ color: '#dc2626', fontSize: '13px' }}>{formError}</p>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                name="name"
                label="Opportunity Name *"
                placeholder="e.g. Dr. Kwame Mensah - December Tour"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Select
                name="stage"
                label="Initial Sales Stage"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                options={stages.map((st) => ({ value: st.key, label: st.name }))}
              />
              <Input
                name="tour"
                label="Tour Package / Service"
                placeholder="e.g. 12-Day Ghana Heritage Tour"
                value={form.tour}
                onChange={(e) => setForm({ ...form, tour: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    name="value"
                    label="Estimated Value"
                    type="number"
                    placeholder="e.g. 4500"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
                <div style={{ width: '110px' }}>
                  <Select
                    name="currency"
                    label="Currency"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    options={CURRENCIES}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Opportunity'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
