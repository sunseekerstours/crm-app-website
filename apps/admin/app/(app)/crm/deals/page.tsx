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
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';

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

interface SalesStageItem {
  id: string;
  key: string;
  name: string;
  color: string;
  order: number;
  description?: string;
}

const DEFAULT_STAGES: SalesStageItem[] = [
  { id: 'stage-1', key: 'NEW', name: 'Initial Inquiry', color: '#0284c7', order: 1, description: 'Fresh travel inquiry or tour request' },
  { id: 'stage-2', key: 'CONTACTED', name: 'Contacted & Discovery', color: '#8b5cf6', order: 2, description: 'Spoke with traveler, gathering preferences & dates' },
  { id: 'stage-3', key: 'QUALIFIED', name: 'Qualified & Itinerary', color: '#06b6d4', order: 3, description: 'Dates, passenger count, and route confirmed' },
  { id: 'stage-4', key: 'PROPOSAL', name: 'Custom Quote Sent', color: '#f59e0b', order: 4, description: 'Official quote (QTE-...) or proposal delivered' },
  { id: 'stage-5', key: 'NEGOTIATION', name: 'Negotiation & Fleet Selection', color: '#ec4899', order: 5, description: 'Adjusting itinerary, hotel, or car choices' },
  { id: 'stage-6', key: 'DEPOSIT', name: 'Awaiting Deposit', color: '#d97706', order: 6, description: 'Itinerary accepted, awaiting payment' },
  { id: 'stage-7', key: 'WON', name: 'Confirmed Booking (Won)', color: '#10b981', order: 7, description: 'Payment confirmed, tour booking locked in' },
  { id: 'stage-8', key: 'LOST', name: 'Lost / Cancelled', color: '#ef4444', order: 8, description: 'Client cancelled or chose alternate option' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const initialForm = {
  name: '',
  customerId: '',
  value: '',
  currency: 'USD',
  stage: 'NEW',
  probability: '50',
  expectedCloseDate: '',
  tour: '',
  destination: '',
};

export default function CrmSalesStagesDealsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Paginated<DealItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<SalesStageItem[]>(DEFAULT_STAGES);
  const [editing, setEditing] = useState<DealItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [filterStage, setFilterStage] = useState<string>('ALL');

  // Note Modal State
  const [noteDeal, setNoteDeal] = useState<DealItem | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Quick Customer Creation modal inside deal form
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', email: '', phone: '' });

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
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '100', page: String(page) });
      if (search) q.set('search', search);
      const res = await api.get<Paginated<DealItem>>(`/deals?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales stages deals');
    }
  }, [page, search]);

  const loadCustomers = useCallback(async () => {
    try {
      const r = await api.get<Paginated<CustomerOption>>('/customers?limit=200');
      setCustomers(r.items ?? []);
    } catch (e) {
      console.error('Failed to load customers:', e);
    }
  }, []);

  useEffect(() => {
    void loadStages();
  }, [loadStages]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  function loadIntoForm(d: DealItem) {
    setEditing(d);
    setFormError(null);
    setForm({
      name: d.name ?? '',
      customerId: d.customerId ?? d.customer?.id ?? '',
      value: d.value != null ? String(d.value) : '',
      currency: d.currency ?? 'USD',
      stage: d.stage ?? (stages[0]?.key || 'NEW'),
      probability: d.probability != null ? String(d.probability) : '50',
      expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.slice(0, 10) : '',
      tour: d.tour ?? '',
      destination: d.destination ?? '',
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
    setShowStageModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(initialForm);
    setSelectedCustomerObj(null);
    setFormError(null);
    setShowStageModal(false);
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
      setCustomers((prev) => [res, ...prev]);
      setForm((f) => ({ ...f, customerId: res.id }));
      setSelectedCustomerObj(res);
      setShowAddCustomer(false);
      setNewCust({ firstName: '', lastName: '', email: '', phone: '' });
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const custName = selectedCustomerObj ? `${selectedCustomerObj.firstName ?? ''} ${selectedCustomerObj.lastName ?? ''}`.trim() : '';
    if (!form.customerId && !custName && !form.name.trim()) {
      setFormError('Please select or create a customer to add to the sales stage.');
      return;
    }
    const finalName = custName ? (form.tour ? `${custName} - ${form.tour}` : custName) : form.name.trim() || 'Sales Stage Customer';

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: finalName,
        customerId: form.customerId || undefined,
        value: form.value !== '' ? Number(form.value) : undefined,
        currency: form.currency,
        stage: form.stage,
        probability: form.probability !== '' ? Number(form.probability) : undefined,
        expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).toISOString() : undefined,
        tour: form.tour || undefined,
        destination: form.destination || undefined,
      };

      if (editing) {
        await api.patch(`/deals/${editing.id}`, payload);
      } else {
        await api.post('/deals', payload);
      }
      reset();
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(d: DealItem) {
    if (!confirm(`Delete sales stage opportunity "${d.name}"?`)) return;
    try {
      await api.delete(`/deals/${d.id}`);
      if (editing?.id === d.id) reset();
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

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

  // Metrics Calculations
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
        subtitle="Advance customers through your tailored sales stages. Move clients across columns, jot in-stage notes, and track pipeline metrics."
        action={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link href="/settings/stages">
              <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚙️ Setup Sales Stages
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                if (!filteredItems.length) return;
                exportToCSV(
                  filteredItems.map((d) => ({
                    Customer: d.customer ? `${d.customer.firstName ?? ''} ${d.customer.lastName ?? ''}`.trim() : d.name ?? '',
                    Tour: d.tour ?? '',
                    Email: d.customer?.email ?? '',
                    Phone: d.customer?.phone ?? '',
                    Value: d.value != null ? Number(d.value) : '',
                    Currency: d.currency ?? 'USD',
                    Stage: d.stage ?? '',
                    CloseDate: d.expectedCloseDate ?? '',
                  })),
                  'sunseekers-sales-stages-deals'
                );
              }}
            >
              📥 Export CSV
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                reset();
                setShowStageModal(true);
              }}
            >
              ➕ Add Customer to Stage
            </Button>
          </div>
        }
      />

      {/* Customer Quick Search & Add Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
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
            reset();
            setShowStageModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ➕ Add Customer to Stage
        </Button>
      </div>

      {/* Real-time Sales Stages Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <Card style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Active Opportunities
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#ffffff' }}>
            {allItems.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#38bdf8' }}>clients in pipeline</span>
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Pipeline Value
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#ffffff' }}>
            ${totalPipelineValue.toLocaleString()}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#bae6fd' }}>USD</span>
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#d1fae5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confirmed Won Bookings
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#ffffff' }}>
            ${(stageMap['WON']?.totalVal || 0).toLocaleString()}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#a7f3d0' }}>
              ({stageMap['WON']?.count || 0} won)
            </span>
          </div>
        </Card>

        <Card style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fef3c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Proposals & Quotes Pending
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#ffffff' }}>
            ${(stageMap['PROPOSAL']?.totalVal || 0).toLocaleString()}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#fde68a' }}>
              ({stageMap['PROPOSAL']?.count || 0} active)
            </span>
          </div>
        </Card>
      </div>

      {/* Interactive Stage Filter Pills & View Mode Switcher */}
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

        {/* View Mode Toggle: Kanban vs Table */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>View:</span>
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
            📋 Kanban Columns
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
            📊 Table List
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {/* KANBAN STAGE COLUMNS VIEW */}
      {viewMode === 'kanban' ? (
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
                {/* Column Header */}
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
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                      {stg.name}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                      ${stgVal.toLocaleString()} USD
                    </span>
                  </div>
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {stgItems.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stgItems.length === 0 ? (
                    <div
                      style={{
                        padding: '28px 12px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '12px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                      }}
                    >
                      No clients currently in {stg.name}
                    </div>
                  ) : (
                    stgItems.map((item) => {
                      const custName = item.customer
                        ? `${item.customer.firstName ?? ''} ${item.customer.lastName ?? ''}`.trim()
                        : item.name || 'Unassigned Customer';
                      const custId = item.customerId ?? item.customer?.id;
                      const latestNote = item.recordedNotes?.[0];

                      return (
                        <Card
                          key={item.id}
                          style={{
                            padding: '14px',
                            background: '#ffffff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            border: '1px solid #e2e8f0',
                          }}
                        >
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
                                {item.customer ? `${item.customer.firstName?.[0] || ''}${item.customer.lastName?.[0] || ''}`.toUpperCase() : '👤'}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {custName}
                                </span>
                                {custId && (
                                  <button
                                    type="button"
                                    onClick={() => setViewCustomerId(custId)}
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
                                    👁️ View Profile
                                  </button>
                                )}
                              </div>
                            </div>

                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7', flexShrink: 0, marginLeft: '6px' }}>
                              {item.value != null ? `${Number(item.value).toLocaleString()} ${item.currency || 'USD'}` : '—'}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {item.tour && (
                              <span style={{ color: '#0284c7', fontWeight: 600 }}>
                                🎒 {item.tour}
                              </span>
                            )}
                            {item.customer?.phone && (
                              <a href={`tel:${item.customer.phone}`} style={{ color: '#64748b', textDecoration: 'none' }}>
                                📞 {item.customer.phone}
                              </a>
                            )}
                            {item.customer?.email && (
                              <a href={`mailto:${item.customer.email}`} style={{ color: '#64748b', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                ✉️ {item.customer.email}
                              </a>
                            )}
                          </div>

                          {/* Latest In-Stage Note snippet */}
                          {latestNote && (
                            <div
                              style={{
                                background: '#f8fafc',
                                borderLeft: '3px solid #0284c7',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#334155',
                                marginBottom: '8px',
                                lineHeight: 1.4,
                              }}
                            >
                              <strong>Note:</strong> {latestNote.content}
                            </div>
                          )}

                          {/* Card Actions: Add Note, Move Stage, Edit */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', gap: '6px' }}>
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
                              📝 Note
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
                                flex: 1,
                                maxWidth: '120px',
                              }}
                            >
                              {stages.map((st) => (
                                <option key={st.key} value={st.key}>
                                  ➔ {st.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => loadIntoForm(item)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0284c7',
                                fontSize: '12px',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
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
        /* TABLE LIST VIEW */
        <Card style={{ marginBottom: '24px' }}>
          <Table<DealItem>
            columns={[
              {
                key: 'customer',
                label: 'Customer Name & Contact',
                render: (d: DealItem) => {
                  const cust = d.customer;
                  const custName = cust
                    ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim()
                    : d.name || 'Unassigned Customer';
                  const custId = d.customerId ?? cust?.id;
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                            {custName}
                          </span>
                          {custId && (
                            <button
                              type="button"
                              onClick={() => setViewCustomerId(custId)}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '4px',
                                padding: '2px 6px',
                                cursor: 'pointer',
                              }}
                            >
                              👁️ View Details
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {cust?.phone && <a href={`tel:${cust.phone}`} style={{ color: '#64748b', textDecoration: 'none' }}>📞 {cust.phone}</a>}
                          {cust?.email && <a href={`mailto:${cust.email}`} style={{ color: '#64748b', textDecoration: 'none' }}>✉️ {cust.email}</a>}
                        </div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'stage',
                label: 'Current Sales Stage',
                render: (d: DealItem) => {
                  const currentStg = getStageConfig(d.stage);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={d.stage || 'NEW'}
                        onChange={(e) => handleMoveStage(d.id, e.target.value)}
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: `2px solid ${currentStg.color}`,
                          background: '#ffffff',
                          color: '#0f172a',
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
                    {d.destination && <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>📍 {d.destination}</span>}
                  </div>
                ),
              },
              {
                key: 'value',
                label: 'Estimated Value',
                render: (d: DealItem) => (
                  <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '13px' }}>
                    {d.value != null ? `${Number(d.value).toLocaleString()} ${d.currency || 'USD'}` : '—'}
                  </span>
                ),
              },
              {
                key: 'notes',
                label: 'Latest Note',
                render: (d: DealItem) => {
                  const note = d.recordedNotes?.[0];
                  return (
                    <div style={{ maxWidth: '240px' }}>
                      {note ? (
                        <span style={{ fontSize: '12px', color: '#475569', display: 'block' }}>{note.content}</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>No notes yet</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNoteDeal(d);
                          setNoteContent('');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '4px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#15803d',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        📝 Add Note
                      </button>
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (d: DealItem) => (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="ghost" onClick={() => loadIntoForm(d)} style={{ fontSize: '12px' }}>
                      ✏️ Edit
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(d)} style={{ fontSize: '12px', color: '#ef4444' }}>
                      🗑️
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredItems}
            keyOf={(d: DealItem) => d.id}
          />
        </Card>
      )}

      {/* ADD / EDIT CUSTOMER IN SALES STAGE MODAL */}
      {showStageModal && (
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
              maxWidth: '620px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
                  {editing ? '✏️ Edit Customer Sales Stage' : '➕ Add Customer to Sales Stage'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Select a customer and place them into your sales pipeline
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
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

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* 1. Customer Live Search Picker (Mandatory) */}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {/* 2. Sales Stage */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Sales Stage *
                  </label>
                  <Select
                    name="stage"
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    options={stages.map((st) => ({
                      value: st.key,
                      label: `${st.name} (${st.key})`,
                    }))}
                  />
                </div>

                {/* 3. Tour / Service Package */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Tour / Service Package (Optional)
                  </label>
                  <Input
                    name="tour"
                    placeholder="e.g. December in Ghana 12-Day Tour"
                    value={form.tour}
                    onChange={(e) => setForm({ ...form, tour: e.target.value })}
                  />
                </div>

                {/* 4. Estimated Value & Currency */}
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

                {/* 5. Expected Close Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Expected Close Date
                  </label>
                  <Input
                    name="expectedCloseDate"
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                  />
                </div>

                {/* 6. Destination */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Destination / Route Notes (Optional)
                  </label>
                  <Input
                    name="destination"
                    placeholder="e.g. Accra, Cape Coast, Kumasi, Mole National Park"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <Button type="button" variant="secondary" onClick={reset}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? <Spinner size={14} /> : editing ? '💾 Update Stage' : '➕ Save Customer to Stage'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK IN-STAGE NOTE MODAL */}
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
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                📝 Add Note: {noteDeal.name}
              </h4>
              <button
                type="button"
                onClick={() => setNoteDeal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Note Details (Saved to Customer Timeline)
              </label>
              <textarea
                rows={4}
                placeholder="e.g. Spoke with client on phone. Prefers 4x4 Prado, 2 rooms, arriving Terminal 3 at 8 PM."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
                autoFocus
              />
            </div>

            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setNoteDeal(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveNote} disabled={savingNote || !noteContent.trim()}>
                {savingNote ? <Spinner size={14} /> : '💾 Save Note'}
              </Button>
            </div>
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
            zIndex: 9999,
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

      {/* VIEW CUSTOMER FULL DETAILS MODAL */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  );
}
