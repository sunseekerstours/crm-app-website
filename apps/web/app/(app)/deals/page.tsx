'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { api, Paginated } from '@/lib/api';
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import { formatDisplayPhone } from '@/lib/phone';

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
  user?: {
    name?: string;
    email?: string;
  };
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
  createdAt?: string;
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

  const displayedStages = filterStage === 'ALL' ? stages : stages.filter((s) => s.key === filterStage);

  // Customer Details Modal
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);

  // Quick Customer Creation modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  // Note Modal State
  const [noteDeal, setNoteDeal] = useState<DealItem | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Deal Details View Modal State
  const [viewDeal, setViewDeal] = useState<DealItem | null>(null);
  const [viewDealNote, setViewDealNote] = useState('');
  const [viewDealSavingNote, setViewDealSavingNote] = useState(false);

  // New Deal / Customer Stage Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [editing, setEditing] = useState<DealItem | null>(null);
  const [form, setForm] = useState({
    customerId: '',
    value: '',
    currency: 'USD',
    stage: 'NEW',
    tour: '',
    destination: '',
    expectedCloseDate: '',
  });
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
      setViewDeal((prev) => (prev && prev.id === dealId ? { ...prev, stage: newStage } : prev));
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

  const handleSaveViewDealNote = async () => {
    if (!viewDeal || !viewDealNote.trim()) return;
    setViewDealSavingNote(true);
    try {
      const res = await api.post<RecordedNote>(`/deals/${viewDeal.id}/notes`, { content: viewDealNote.trim() });
      setViewDeal((prev) => (prev ? { ...prev, recordedNotes: [res, ...(prev.recordedNotes || [])] } : null));
      setViewDealNote('');
      void load();
    } catch (err: any) {
      alert(err?.message || 'Failed to save note');
    } finally {
      setViewDealSavingNote(false);
    }
  };

  function loadIntoForm(d: DealItem) {
    setEditing(d);
    setFormError(null);
    setForm({
      customerId: d.customerId ?? d.customer?.id ?? '',
      value: d.value != null ? String(d.value) : '',
      currency: d.currency ?? 'USD',
      stage: d.stage ?? (stages[0]?.key || 'NEW'),
      tour: d.tour ?? '',
      destination: d.destination ?? '',
      expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.slice(0, 10) : '',
    });
    if (d.customer) {
      setSelectedCustomerObj({
        id: d.customer.id,
        firstName: d.customer.firstName,
        lastName: d.customer.lastName,
        email: d.customer.email,
        phone: d.customer.phone,
      });
    } else {
      setSelectedCustomerObj(null);
    }
    setShowNewModal(true);
  }

  async function handleQuickAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCust.firstName || !newCust.lastName) {
      alert('First and Last name are required');
      return;
    }
    try {
      const res = await api.post<CustomerOption>('/customers', {
        firstName: newCust.firstName,
        lastName: newCust.lastName,
        email: newCust.email || undefined,
        phone: newCust.phone || undefined,
      });
      setForm((f) => ({ ...f, customerId: res.id }));
      setSelectedCustomerObj(res);
      setShowAddCustomer(false);
      setNewCust({ firstName: '', lastName: '', email: '', phone: '' });
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const custName = selectedCustomerObj ? `${selectedCustomerObj.firstName ?? ''} ${selectedCustomerObj.lastName ?? ''}`.trim() : '';
    if (!form.customerId && !custName) {
      setFormError('Please select or create a customer to add to the sales stage.');
      return;
    }
    const finalName = custName ? (form.tour ? `${custName} - ${form.tour}` : custName) : 'Sales Stage Customer';

    setSubmitting(true);
    try {
      const payload = {
        name: finalName,
        customerId: form.customerId || undefined,
        value: form.value ? Number(form.value) : undefined,
        currency: form.currency,
        stage: form.stage,
        tour: form.tour || undefined,
        destination: form.destination || undefined,
        expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).toISOString() : undefined,
      };

      if (editing) {
        await api.patch(`/deals/${editing.id}`, payload);
      } else {
        await api.post('/deals', payload);
      }
      setShowNewModal(false);
      setEditing(null);
      setForm({ customerId: '', value: '', currency: 'USD', stage: 'NEW', tour: '', destination: '', expectedCloseDate: '' });
      setSelectedCustomerObj(null);
      void load();
    } catch (err: any) {
      setFormError(err?.message || (editing ? 'Failed to update deal' : 'Failed to add customer to stage'));
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
            <Button
              variant="primary"
              onClick={() => {
                setForm({ customerId: '', value: '', currency: 'USD', stage: 'NEW', tour: '', destination: '', expectedCloseDate: '' });
                setSelectedCustomerObj(null);
                setFormError(null);
                setShowNewModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ➕ Add Customer to Stage
            </Button>
          </div>
        }
      />

      {/* Customer Quick Search & Add Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '520px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>
            🔍
          </span>
          <input
            type="search"
            placeholder="Search customer name, phone, email, or tour on pipeline board…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              background: '#f8fafc',
            }}
          />
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setForm({ customerId: '', value: '', currency: 'USD', stage: 'NEW', tour: '', destination: '', expectedCloseDate: '' });
            setSelectedCustomerObj(null);
            setFormError(null);
            setShowNewModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ➕ Add Customer to Stage
        </Button>
      </div>

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
                gridTemplateColumns:
                  displayedStages.length === 1
                    ? 'minmax(320px, 700px)'
                    : `repeat(${displayedStages.length}, minmax(145px, 1fr))`,
                gap: '10px',
                overflowX: 'auto',
                paddingBottom: '20px',
                alignItems: 'start',
                width: '100%',
              }}
            >
              {displayedStages.map((stg) => {
                const stgItems = allItems.filter((i) => (i.stage || 'NEW') === stg.key);
                const stgVal = stgItems.reduce((acc, c) => acc + (Number(c.value) || 0), 0);

                return (
                  <div
                    key={stg.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: '800px',
                      minWidth: displayedStages.length === 1 ? '320px' : '145px',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 12px',
                        borderTop: `3.5px solid ${stg.color}`,
                        borderBottom: '1px solid #e2e8f0',
                        background: '#ffffff',
                        borderTopLeftRadius: '10px',
                        borderTopRightRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {stg.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>${stgVal.toLocaleString()} USD</span>
                      </div>
                      <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', flexShrink: 0 }}>
                        {stgItems.length}
                      </span>
                    </div>

                    <div style={{ padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stgItems.length === 0 ? (
                        <div style={{ padding: '20px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                          No clients
                        </div>
                      ) : (
                    stgItems.map((item) => {
                      const custName = item.customer
                        ? `${item.customer.firstName ?? ''} ${item.customer.lastName ?? ''}`.trim()
                        : item.name || 'Unassigned Customer';
                      const custId = item.customerId ?? item.customer?.id;
                      const latestNote = item.recordedNotes?.[0];
                      const initials = item.customer
                        ? `${item.customer.firstName?.[0] || ''}${item.customer.lastName?.[0] || ''}`.toUpperCase() || '👤'
                        : '👤';

                      return (
                        <Card key={item.id} style={{ padding: '14px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                          {/* Card Header: Customer Avatar & Name & View Details */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {custName}
                                </span>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setViewDeal(item)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#0284c7',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                    }}
                                  >
                                    👁️ View Deal
                                  </button>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <button
                                    type="button"
                                    onClick={() => loadIntoForm(item)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#1d4ed8',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      padding: 0,
                                    }}
                                  >
                                    ✏️ Edit
                                  </button>
                                </div>
                              </div>
                            </div>

                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7', flexShrink: 0, marginLeft: '6px' }}>
                              {item.value != null ? `$${Number(item.value).toLocaleString()}` : '—'}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {item.tour && (
                              <span style={{ color: '#0284c7', fontWeight: 600 }}>
                                🎒 {item.tour}
                              </span>
                            )}
                            {item.customer?.phone && (
                              <a
                                href={`tel:${formatDisplayPhone(item.customer.phone).replace(/[^0-9+]/g, '')}`}
                                style={{ color: '#64748b', textDecoration: 'none' }}
                              >
                                📞 {formatDisplayPhone(item.customer.phone)}
                              </a>
                            )}
                            {item.customer?.email && (
                              <a href={`mailto:${item.customer.email}`} style={{ color: '#64748b', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                ✉️ {item.customer.email}
                              </a>
                            )}
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
                key: 'customer',
                label: 'Customer Name & Contact',
                render: (d: DealItem) => {
                  const cust = d.customer;
                  const custName = cust
                    ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim()
                    : d.name || 'Unassigned Customer';
                  const initials = cust
                    ? `${cust.firstName?.[0] || ''}${cust.lastName?.[0] || ''}`.toUpperCase() || '👤'
                    : '👤';

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', display: 'block' }}>
                          {custName}
                        </span>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {cust?.phone && (
                            <a
                              href={`tel:${formatDisplayPhone(cust.phone).replace(/[^0-9+]/g, '')}`}
                              style={{ color: '#64748b', textDecoration: 'none' }}
                            >
                              📞 {formatDisplayPhone(cust.phone)}
                            </a>
                          )}
                          {cust?.email && (
                            <a href={`mailto:${cust.email}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                              ✉️ {cust.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'stage',
                label: 'Sales Stage',
                render: (d: DealItem) => {
                  const currentStg = getStageConfig(d.stage);
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: `${currentStg.color}15`,
                        color: currentStg.color,
                        border: `1px solid ${currentStg.color}35`,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: currentStg.color }} />
                      {currentStg.name}
                    </span>
                  );
                },
              },
              {
                key: 'tour',
                label: 'Tour / Package',
                render: (d: DealItem) => (
                  <div>
                    {d.tour ? (
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0284c7' }}>🎒 {d.tour}</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>General Inquiry</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'value',
                label: 'Estimated Value',
                render: (d: DealItem) => (
                  <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {d.value != null ? `${Number(d.value).toLocaleString()} ${d.currency || 'USD'}` : '—'}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (d: DealItem) => (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => setViewDeal(d)}
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
                      title="View complete deal details, client profile, and notes"
                    >
                      👁️ View
                    </button>
                    <button
                      type="button"
                      onClick={() => loadIntoForm(d)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ✏️ Edit
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

      {/* NEW CUSTOMER IN SALES STAGE MODAL */}
      {showNewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                  {editing ? '✏️ Edit Customer Sales Stage / Deal' : '➕ Add Customer to Sales Stage'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  {editing ? 'Update stage, tour, value, and expected close date' : 'Select customer and assign their current stage in the sales process'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowNewModal(false); setEditing(null); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '18px',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* Customer Live Search Picker */}
              <CustomerSearchPicker
                label="Customer Name *"
                value={form.customerId}
                selectedCustomer={selectedCustomerObj}
                onChange={(custId, cust) => {
                  setForm((f) => ({ ...f, customerId: custId }));
                  setSelectedCustomerObj(cust);
                }}
                onViewDetails={(custId) => setViewCustomerId(custId)}
                onQuickAdd={() => setShowAddCustomer(true)}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <Select
                  name="stage"
                  label="Sales Stage *"
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

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Estimated Value & Currency
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        name="value"
                        type="number"
                        placeholder="e.g. 4500"
                        value={form.value}
                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                      />
                    </div>
                    <div style={{ width: '110px' }}>
                      <Select
                        name="currency"
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        options={CURRENCIES}
                      />
                    </div>
                  </div>
                </div>

                <Input
                  name="expectedCloseDate"
                  label="Expected Close Date"
                  type="date"
                  value={form.expectedCloseDate}
                  onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                />

                <div style={{ gridColumn: '1 / -1' }}>
                  <Input
                    name="destination"
                    label="Destination / Notes"
                    placeholder="e.g. Accra, Cape Coast, Elmina Castle"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <Button type="button" variant="secondary" onClick={() => { setShowNewModal(false); setEditing(null); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Saving…' : (editing ? '💾 Save Changes' : '➕ Save Customer to Stage')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '440px', width: '100%', padding: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>Quick Add Customer</h4>
            <form onSubmit={handleQuickAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                name="firstName"
                placeholder="First Name *"
                value={newCust.firstName}
                onChange={(e) => setNewCust({ ...newCust, firstName: e.target.value })}
                required
              />
              <Input
                name="lastName"
                placeholder="Last Name *"
                value={newCust.lastName}
                onChange={(e) => setNewCust({ ...newCust, lastName: e.target.value })}
                required
              />
              <Input
                name="email"
                placeholder="Email Address"
                value={newCust.email}
                onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
              />
              <Input
                name="phone"
                placeholder="Phone Number"
                value={newCust.phone}
                onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowAddCustomer(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DEAL FULL DETAILS MODAL */}
      {viewDeal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '20px',
          }}
          onClick={() => setViewDeal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                background: '#f8fafc',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {viewDeal.name}
                  </h3>
                  {(() => {
                    const stg = getStageConfig(viewDeal.stage);
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: `${stg.color}15`,
                          color: stg.color,
                          border: `1px solid ${stg.color}40`,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: stg.color }} />
                        {stg.name}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Deal ID: {viewDeal.id}
                  {viewDeal.createdAt && ` • Created ${new Date(viewDeal.createdAt).toLocaleDateString()}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDeal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#94a3b8',
                  padding: '4px',
                  borderRadius: '6px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Customer Information Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                      flexShrink: 0,
                    }}
                  >
                    {viewDeal.customer
                      ? `${(viewDeal.customer.firstName || '')[0] || ''}${(viewDeal.customer.lastName || '')[0] || ''}`.toUpperCase() || 'C'
                      : 'C'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>
                      {viewDeal.customer
                        ? `${viewDeal.customer.firstName ?? ''} ${viewDeal.customer.lastName ?? ''}`.trim()
                        : 'No Customer Linked'}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                      {viewDeal.customer?.email && (
                        <a href={`mailto:${viewDeal.customer.email}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                          ✉️ {viewDeal.customer.email}
                        </a>
                      )}
                      {viewDeal.customer?.phone && (
                        <a
                          href={`tel:${formatDisplayPhone(viewDeal.customer.phone).replace(/[^0-9+]/g, '')}`}
                          style={{ color: '#475569', textDecoration: 'none' }}
                        >
                          📞 {formatDisplayPhone(viewDeal.customer.phone)}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {(viewDeal.customer?.id || viewDeal.customerId) && (
                  <button
                    type="button"
                    onClick={() => {
                      const cid = viewDeal.customer?.id || viewDeal.customerId;
                      if (cid) setViewCustomerId(cid);
                    }}
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    👤 View Full Customer Profile
                  </button>
                )}
              </div>

              {/* Deal Details & Value Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Estimated Value
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    {viewDeal.value != null ? `${Number(viewDeal.value).toLocaleString()} ${viewDeal.currency || 'USD'}` : '—'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tour / Experience
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {viewDeal.tour || '—'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Destination
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {viewDeal.destination || '—'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Win Probability / Date
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                    {viewDeal.probability != null ? `${viewDeal.probability}%` : '—'}
                    {viewDeal.expectedCloseDate && ` • ${new Date(viewDeal.expectedCloseDate).toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              {/* Stage Progression Selector */}
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Move Sales Stage:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {stages.map((st) => {
                    const isCurrent = (viewDeal.stage || 'NEW') === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => {
                          handleMoveStage(viewDeal.id, st.key);
                          setViewDeal((prev) => (prev ? { ...prev, stage: st.key } : null));
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isCurrent ? `2px solid ${st.color}` : '1px solid #cbd5e1',
                          background: isCurrent ? st.color : '#ffffff',
                          color: isCurrent ? '#ffffff' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCurrent ? '#ffffff' : st.color }} />
                        {st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes & Activity History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📝 Activity &amp; Recorded Notes ({viewDeal.recordedNotes?.length || 0})</span>
                </div>

                {/* Add new note box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <textarea
                    rows={2}
                    placeholder="Log a client conversation, preference, or tour update..."
                    value={viewDealNote}
                    onChange={(e) => setViewDealNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="primary"
                      onClick={handleSaveViewDealNote}
                      disabled={viewDealSavingNote || !viewDealNote.trim()}
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                      {viewDealSavingNote ? <Spinner /> : 'Save Note to Deal'}
                    </Button>
                  </div>
                </div>

                {/* List of notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {viewDeal.recordedNotes && viewDeal.recordedNotes.length > 0 ? (
                    viewDeal.recordedNotes.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ color: '#1e293b', whiteSpace: 'pre-wrap' }}>{n.content}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'flex', gap: '8px' }}>
                          <span>🕒 {new Date(n.createdAt).toLocaleString()}</span>
                          {n.user && <span>• by {n.user.name || n.user.email}</span>}
                          {n.createdBy && <span>• by {n.createdBy.firstName || ''} {n.createdBy.lastName || ''}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
                      No activity notes logged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <Button
                variant="secondary"
                onClick={() => {
                  const d = viewDeal;
                  setViewDeal(null);
                  loadIntoForm(d);
                }}
              >
                ✏️ Edit Deal
              </Button>
              <Button onClick={() => setViewDeal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER FULL DETAILS MODAL */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  );
}
