'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { api, type Paginated } from '@/lib/api';
import { PageHeader, Card, Button, Spinner } from '@/components/ui';
import {
  type CustomTour,
  type TourChecklistItem,
  type TourType,
  type TourOpsStatus,
  getStoredCustomTours,
  saveStoredCustomTours,
  createDefaultChecklist,
  computeChecklistProgress,
  getAutoStatus,
} from '@/lib/custom-tours';

export default function AdminCustomToursOperationsPage() {
  const [tours, setTours] = useState<CustomTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'INDIVIDUAL' | 'GROUP' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [customers, setCustomers] = useState<{ id: string; firstName: string; lastName: string; email?: string; phone?: string }[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [selectedTourForDetails, setSelectedTourForDetails] = useState<CustomTour | null>(null);
  const [newCustomTaskTitle, setNewCustomTaskTitle] = useState('');
  const [activeAddingTaskForTourId, setActiveAddingTaskForTourId] = useState<string | null>(null);

  // Form State
  const initialForm = {
    tourName: '',
    tourType: 'INDIVIDUAL' as TourType,
    clientName: '',
    customerId: '',
    destinations: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    paxCount: '2',
    quotedPrice: '2500',
    currency: 'USD',
    operationsLead: 'Operations Team',
    contactPhone: '',
    contactEmail: '',
    hotelPreference: '',
    specialRequests: '',
  };
  const [form, setForm] = useState(initialForm);

  // Load Tours & Customers
  useEffect(() => {
    try {
      const stored = getStoredCustomTours();
      setTours(stored);
    } catch (e) {
      console.warn('Could not load custom tours from storage', e);
    } finally {
      setLoading(false);
    }

    api.get<Paginated<any>>('/customers?limit=200')
      .then(r => setCustomers(r.items || []))
      .catch(() => {});
  }, []);

  const persistTours = useCallback((updated: CustomTour[]) => {
    setTours(updated);
    saveStoredCustomTours(updated);
  }, []);

  // Filtered list
  const filteredTours = useMemo(() => {
    return tours.filter((t) => {
      if (activeTab === 'INDIVIDUAL' && t.tourType !== 'INDIVIDUAL') return false;
      if (activeTab === 'GROUP' && t.tourType !== 'GROUP') return false;
      if (activeTab === 'ACTIVE' && (t.status === 'COMPLETED' || t.status === 'CANCELLED')) return false;
      if (activeTab === 'COMPLETED' && t.status !== 'COMPLETED') return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = t.tourName.toLowerCase().includes(q);
        const matchClient = t.clientName.toLowerCase().includes(q);
        const matchDest = t.destinations.toLowerCase().includes(q);
        const matchLead = t.operationsLead.toLowerCase().includes(q);
        if (!matchName && !matchClient && !matchDest && !matchLead) return false;
      }
      return true;
    });
  }, [tours, activeTab, statusFilter, search]);

  // Overall Operations Metrics
  const stats = useMemo(() => {
    const total = tours.length;
    const individual = tours.filter(t => t.tourType === 'INDIVIDUAL').length;
    const group = tours.filter(t => t.tourType === 'GROUP').length;
    const active = tours.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
    const ready = tours.filter(t => t.status === 'READY_FOR_DEPARTURE').length;
    const completed = tours.filter(t => t.status === 'COMPLETED').length;
    return { total, individual, group, active, ready, completed };
  }, [tours]);

  // Handle Checklist Item Toggle
  function handleToggleChecklistItem(tourId: string, itemId: string) {
    const updated = tours.map((t) => {
      if (t.id !== tourId) return t;
      const updatedChecklist = t.checklist.map((item) => {
        if (item.id !== itemId) return item;
        const nextState = !item.isCompleted;
        return {
          ...item,
          isCompleted: nextState,
          completedAt: nextState ? new Date().toISOString() : undefined,
          completedBy: nextState ? 'Admin Ops' : undefined,
        };
      });
      const newStatus = getAutoStatus(updatedChecklist);
      return {
        ...t,
        checklist: updatedChecklist,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    });
    persistTours(updated);
  }

  // Handle Adding Custom Task
  function handleAddCustomTask(tourId: string) {
    if (!newCustomTaskTitle.trim()) return;
    const updated = tours.map((t) => {
      if (t.id !== tourId) return t;
      const newItem: TourChecklistItem = {
        id: `chk_custom_${Date.now()}`,
        phase: 'CUSTOM',
        title: newCustomTaskTitle.trim(),
        description: 'Trip-specific tourist request',
        isCompleted: false,
        isRequired: false,
      };
      return {
        ...t,
        checklist: [...t.checklist, newItem],
        updatedAt: new Date().toISOString(),
      };
    });
    persistTours(updated);
    setNewCustomTaskTitle('');
    setActiveAddingTaskForTourId(null);
  }

  // Open Create Modal
  function handleOpenCreate() {
    setEditingTourId(null);
    setForm(initialForm);
    setShowCreateModal(true);
  }

  // Open Edit Modal
  function handleOpenEdit(t: CustomTour) {
    setEditingTourId(t.id);
    setForm({
      tourName: t.tourName,
      tourType: t.tourType,
      clientName: t.clientName,
      customerId: t.customerId || '',
      destinations: t.destinations,
      startDate: t.startDate,
      endDate: t.endDate,
      paxCount: String(t.paxCount),
      quotedPrice: String(t.quotedPrice),
      currency: t.currency || 'USD',
      operationsLead: t.operationsLead,
      contactPhone: t.contactPhone || '',
      contactEmail: t.contactEmail || '',
      hotelPreference: t.hotelPreference || '',
      specialRequests: t.specialRequests || '',
    });
    setShowCreateModal(true);
  }

  // Submit Tour Form
  function handleSubmitTour(e: React.FormEvent) {
    e.preventDefault();
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    if (editingTourId) {
      const updated = tours.map((t) => {
        if (t.id !== editingTourId) return t;
        return {
          ...t,
          tourName: form.tourName.trim(),
          tourType: form.tourType,
          clientName: form.clientName.trim(),
          customerId: form.customerId || undefined,
          destinations: form.destinations.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          durationDays,
          paxCount: parseInt(form.paxCount, 10) || 1,
          quotedPrice: parseFloat(form.quotedPrice) || 0,
          currency: form.currency,
          operationsLead: form.operationsLead.trim() || 'Operations Team',
          contactPhone: form.contactPhone.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          hotelPreference: form.hotelPreference.trim() || undefined,
          specialRequests: form.specialRequests.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };
      });
      persistTours(updated);
    } else {
      const newTour: CustomTour = {
        id: `ct_${Date.now()}`,
        tourName: form.tourName.trim(),
        tourType: form.tourType,
        clientName: form.clientName.trim(),
        customerId: form.customerId || undefined,
        destinations: form.destinations.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        durationDays,
        paxCount: parseInt(form.paxCount, 10) || 1,
        quotedPrice: parseFloat(form.quotedPrice) || 0,
        currency: form.currency,
        operationsLead: form.operationsLead.trim() || 'Operations Team',
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        hotelPreference: form.hotelPreference.trim() || undefined,
        specialRequests: form.specialRequests.trim() || undefined,
        status: 'PLANNING',
        checklist: createDefaultChecklist(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persistTours([newTour, ...tours]);
    }
    setShowCreateModal(false);
  }

  // Delete Tour
  function handleDeleteTour(tourId: string) {
    if (!window.confirm('Are you sure you want to delete this customised tour and its operational checklist?')) return;
    const updated = tours.filter(t => t.id !== tourId);
    persistTours(updated);
    if (selectedTourForDetails?.id === tourId) setSelectedTourForDetails(null);
  }

  // Status Badge Helper
  function renderStatusBadge(status: TourOpsStatus) {
    switch (status) {
      case 'READY_FOR_DEPARTURE':
        return <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🟢 Ready for Departure</span>;
      case 'LOGISTICS_IN_PROGRESS':
        return <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🟡 Logistics In Progress</span>;
      case 'PLANNING':
        return <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid #0284c7', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🔵 Planning &amp; Sourcing</span>;
      case 'ON_TOUR':
        return <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid #a855f7', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🟣 On Tour (In Transit)</span>;
      case 'COMPLETED':
        return <span style={{ background: 'rgba(34, 197, 94, 0.25)', color: '#4ade80', border: '1px solid #22c55e', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>🏁 Tour Done / Completed</span>;
      case 'CANCELLED':
        return <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>❌ Cancelled</span>;
      default:
        return <span style={{ background: '#334155', color: '#cbd5e1', padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>{status}</span>;
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Navigation Switcher between Public Packages & Custom Ops */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '6px 12px',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            background: '#0284c7',
            color: '#ffffff'
          }}>
            📋 Customised Tours &amp; Ops Checklists
          </span>
          <Link
            href="/crm/tours"
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              textDecoration: 'none'
            }}
          >
            🗺️ Public Tour Catalogue &amp; Packages ↗
          </Link>
        </div>

        <Link
          href="/crm/fleet"
          style={{
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          🚌 Fleet Timeline &amp; Driver Per Diem ↗
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title="Customised Tours & Trip Operations Hub"
        subtitle="Manage tailor-made individual (FIT) and group departures with full operational readiness checklists"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href="/crm/fleet"
              className="btn"
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600
              }}
            >
              🚌 Fleet Timeline &amp; Drivers ↗
            </Link>
            <Button onClick={handleOpenCreate}>
              + Create Customised Tour
            </Button>
          </div>
        }
      />

      {/* High-Impact Operational Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>All Custom Tours</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{stats.individual} Individuals • {stats.group} Groups</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase' }}>In Operations</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>{stats.active}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Logistics &amp; bookings ongoing</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>Ready for Departure</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', marginTop: 4 }}>{stats.ready}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>All key items checked off (100%)</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase' }}>Tours Done &amp; Concluded</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#60a5fa', marginTop: 4 }}>{stats.completed}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Successfully executed trips</div>
        </div>
      </div>

      {/* Navigation Tabs & Controls */}
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Custom Tours' },
            { id: 'INDIVIDUAL', label: '👤 Individuals (FIT)' },
            { id: 'GROUP', label: '👥 Group Tours' },
            { id: 'ACTIVE', label: '⚡ Active Operations' },
            { id: 'COMPLETED', label: '🏁 Completed / Tours Done' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.id ? '#0284c7' : 'rgba(255,255,255,0.04)',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search tour, tourist, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '6px 12px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              minWidth: 240
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#94a3b8',
              fontSize: 12
            }}
          >
            <option value="">-- All Statuses --</option>
            <option value="PLANNING">Planning &amp; Sourcing</option>
            <option value="LOGISTICS_IN_PROGRESS">Logistics In Progress</option>
            <option value="READY_FOR_DEPARTURE">Ready for Departure</option>
            <option value="ON_TOUR">On Tour</option>
            <option value="COMPLETED">Tour Done (Completed)</option>
          </select>
        </div>
      </div>

      {/* Main Tour Cards Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>
      ) : filteredTours.length === 0 ? (
        <Card>
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗺️</div>
            <h3 style={{ fontSize: 18, color: '#f8fafc', marginBottom: 6 }}>No customised tours found</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 440, margin: '0 auto 16px' }}>
              Create a new tailor-made tour for individuals or groups with an integrated operational checklist to track itineraries, lodging, permits, and tour completion.
            </p>
            <Button onClick={handleOpenCreate}>+ Create First Custom Tour</Button>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filteredTours.map((t) => {
            const { completed, total, percent } = computeChecklistProgress(t.checklist);

            return (
              <div
                key={t.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Tour Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{
                        background: t.tourType === 'INDIVIDUAL' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                        color: t.tourType === 'INDIVIDUAL' ? '#38bdf8' : '#c084fc',
                        border: `1px solid ${t.tourType === 'INDIVIDUAL' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        {t.tourType === 'INDIVIDUAL' ? '👤 Individual (FIT)' : '👥 Group Tour'}
                      </span>
                      {renderStatusBadge(t.status)}
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        📅 {t.startDate} to {t.endDate} ({t.durationDays} {t.durationDays === 1 ? 'day' : 'days'})
                      </span>
                    </div>

                    <h2 style={{ margin: '4px 0', fontSize: 19, fontWeight: 700, color: '#f8fafc' }}>
                      {t.tourName}
                    </h2>

                    <div style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                      <span><b>Tourist / Client:</b> {t.clientName} ({t.paxCount} {t.paxCount === 1 ? 'pax' : 'passengers'})</span>
                      <span><b>Destinations:</b> 📍 {t.destinations}</span>
                      <span><b>Ops Lead:</b> 👨‍💼 {t.operationsLead}</span>
                      <span><b>Budget / Price:</b> 💰 {t.currency} {t.quotedPrice.toLocaleString()}</span>
                    </div>

                    {t.hotelPreference && (
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                        🏨 <b>Lodging Preference:</b> {t.hotelPreference}
                      </div>
                    )}
                    {t.specialRequests && (
                      <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 2 }}>
                        ⚠️ <b>Special Requirements:</b> {t.specialRequests}
                      </div>
                    )}
                  </div>

                  {/* Quick Card Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Link
                      href={`/crm/fleet`}
                      style={{
                        background: '#0f172a',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      title="Open Fleet Timeline to dispatch vehicle and calculate driver allowance"
                    >
                      🚌 Book Fleet
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      style={{
                        background: '#0f172a',
                        color: '#cbd5e1',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Edit Tour
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTour(t.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                      title="Delete this customised tour"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Readiness Progress Bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                      Operational Readiness Checklist ({completed} of {total} done)
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: percent === 100 ? '#34d399' : percent > 50 ? '#38bdf8' : '#fbbf24' }}>
                      {percent}% Operational Completion
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: percent === 100 ? '#10b981' : percent >= 60 ? '#3b82f6' : '#f59e0b',
                        borderRadius: 4,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                {/* 6-Stage Operational Checklist Matrix */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 10,
                  background: 'rgba(15, 23, 42, 0.65)',
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  {t.checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklistItem(t.id, item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 8,
                        background: item.isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${item.isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => {}} // Controlled by container onClick
                        style={{ marginTop: 2, cursor: 'pointer', transform: 'scale(1.15)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: item.isCompleted ? '#a7f3d0' : '#f8fafc',
                          textDecoration: item.isCompleted ? 'line-through' : 'none',
                        }}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {item.description}
                          </div>
                        )}
                        {item.isCompleted && item.completedAt && (
                          <div style={{ fontSize: 10, color: '#34d399', marginTop: 3 }}>
                            ✓ Verified {new Date(item.completedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Task Quick Input */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {activeAddingTaskForTourId === t.id ? (
                    <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 500 }}>
                      <input
                        type="text"
                        placeholder="Add custom task (e.g. VIP Airport pickup, Vegan dinner...)"
                        value={newCustomTaskTitle}
                        onChange={(e) => setNewCustomTaskTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomTask(t.id); }}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 12
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomTask(t.id)}
                        style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Add Task
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAddingTaskForTourId(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setActiveAddingTaskForTourId(t.id); setNewCustomTaskTitle(''); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      + Add Custom Operational Task to this Tour
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE / EDIT CUSTOMISED TOUR                      */}
      {/* ════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 680,
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                  {editingTourId ? 'Edit Customised Tour' : 'Create New Customised Tour (Individual / Group)'}
                </h2>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Automatically attaches the 6-stage operational execution checklist
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTour}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Tour Type Selector */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                    Tour Category / Audience Type *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tourType: 'INDIVIDUAL' })}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: form.tourType === 'INDIVIDUAL' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                        background: form.tourType === 'INDIVIDUAL' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                        color: form.tourType === 'INDIVIDUAL' ? '#38bdf8' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: 14 }}>👤 Individual (FIT)</div>
                      <div style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8', marginTop: 2 }}>
                        Solo traveler, couple, or small family (1-4 pax)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tourType: 'GROUP' })}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: form.tourType === 'GROUP' ? '2px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                        background: form.tourType === 'GROUP' ? 'rgba(168, 85, 247, 0.15)' : '#0f172a',
                        color: form.tourType === 'GROUP' ? '#c084fc' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: 14 }}>👥 Group Tour</div>
                      <div style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8', marginTop: 2 }}>
                        Corporate retreat, school, diaspora, or club (5+ pax)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tour Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Custom Tour Title / Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smith Family 5-Day Heritage Experience, Howard Alumni 10-Day Ghana Tour"
                    value={form.tourName}
                    onChange={(e) => setForm({ ...form, tourName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Client / Group Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>
                      Tourist Name / Group Lead / Organization *
                    </label>
                    {customers.length > 0 && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>Quick select CRM client</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: customers.length > 0 ? '1.2fr 1fr' : '1fr', gap: 8 }}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Amanda Smith, Howard University Alumni"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    />
                    {customers.length > 0 && (
                      <select
                        value={form.customerId}
                        onChange={(e) => {
                          const custId = e.target.value;
                          const c = customers.find(x => x.id === custId);
                          if (c) {
                            setForm({
                              ...form,
                              customerId: c.id,
                              clientName: `${c.firstName} ${c.lastName}`.trim(),
                              contactEmail: c.email || form.contactEmail,
                              contactPhone: c.phone || form.contactPhone,
                            });
                          } else {
                            setForm({ ...form, customerId: '' });
                          }
                        }}
                        style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#94a3b8', fontSize: 12 }}
                      >
                        <option value="">-- Quick Pick CRM Customer --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Destinations */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Destinations &amp; Key Stops *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accra, Cape Coast, Elmina, Kakum, Kumasi, Volta Region"
                    value={form.destinations}
                    onChange={(e) => setForm({ ...form, destinations: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Return / End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Pax Count */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Pax Count (Passengers) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.paxCount}
                    onChange={(e) => setForm({ ...form, paxCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Quoted Price & Currency */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 6 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      Quoted Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 3500"
                      value={form.quotedPrice}
                      onChange={(e) => setForm({ ...form, quotedPrice: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      Currency
                    </label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="GHS">GHS (₵)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                {/* Operations Lead Staff */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Operations Lead (Staff) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kofi Mensah, Ama Serwaa"
                    value={form.operationsLead}
                    onChange={(e) => setForm({ ...form, operationsLead: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Contact Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +233 24 555 1201"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Hotel / Lodging Preference */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Hostel / Hotel / Lodging Preference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coconut Grove Beach Resort / Lancaster Kumasi / Eco-lodge"
                    value={form.hotelPreference}
                    onChange={(e) => setForm({ ...form, hotelPreference: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Special Requests */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Special Requests / VIP Instructions / Dietary Needs
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Child car booster seat required; 2 guests vegetarian; special chief welcoming ceremony at Manhyia"
                    value={form.specialRequests}
                    onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <Button type="submit">
                  {editingTourId ? 'Save Changes' : 'Create & Generate Checklist'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
