'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Card, Button, Spinner } from '@/components/ui';

interface KpiItem {
  key: string;
  label: string;
  target: string | number;
  actual: number;
}

interface PipelineDeal {
  id?: string;
  clientOpportunity: string;
  stage: string;
  nextAction: string;
  estValueGhc: number;
}

interface Commitment {
  commitment: string;
  owner: string;
  dueDate: string;
}

interface ReportData {
  id?: string | null;
  userId: string;
  repName: string;
  managerName: string;
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  activitySummary: {
    calls: number;
    emails: number;
    visits: number;
    callsEmailsVisitsFormatted?: string;
    newProspectsEngaged: number;
    meetingsHeld: number;
    proposalsSubmitted: number;
    followUpsCompleted: number;
    dealsClosed: number;
    revenueCollectedGhc: number;
  };
  kpis: KpiItem[];
  pipelineDeals: PipelineDeal[];
  wins: string[];
  blockers: string[];
  keyLearning: string;
  commitments: Commitment[];
  overallPerformance: string;
  keyWinHighlight: string;
  supportNeeded: string;
  projectedRevenueGhc: number;
  onTrackStatus: string;
  repSignedAt?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  managerNotes?: string;
}

interface TargetSettings {
  leads: number | string;
  meetings: number | string;
  proposals: number | string;
  dealsClosed: number | string;
  revenueGhc: number | string;
}

interface UserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

export default function WeeklySalesReportPage() {
  const { user } = useAuth();

  // Role verification: Only sales team & management
  const isAuthorized = useMemo(() => {
    if (!user?.roles) return false;
    const allowed = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_AGENT'];
    return user.roles.some((r) => allowed.includes(r.toUpperCase()));
  }, [user]);

  const isManagerOrAdmin = useMemo(() => {
    if (!user?.roles) return false;
    return user.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(r.toUpperCase()));
  }, [user]);

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [salesUsers, setSalesUsers] = useState<UserOption[]>([]);
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Target Settings Modal
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetSettings, setTargetSettings] = useState<TargetSettings>({
    leads: 10,
    meetings: 5,
    proposals: 3,
    dealsClosed: 2,
    revenueGhc: 25000,
  });

  // Report Form Data
  const [report, setReport] = useState<ReportData | null>(null);

  // New item inputs
  const [newWin, setNewWin] = useState('');
  const [newBlocker, setNewBlocker] = useState('');
  const [newCommitment, setNewCommitment] = useState<Commitment>({
    commitment: '',
    owner: '',
    dueDate: '',
  });
  const [newDeal, setNewDeal] = useState<PipelineDeal>({
    clientOpportunity: '',
    stage: 'Prospect',
    nextAction: '',
    estValueGhc: 0,
  });

  // Initialize: load users and current targets
  useEffect(() => {
    if (!user) return;
    setSelectedUserId(user.id);

    if (isManagerOrAdmin) {
      api.get<{ items: UserOption[] }>('/users?limit=50')
        .then((res) => {
          if (res?.items) setSalesUsers(res.items);
        })
        .catch(() => {});
    }

    // Load active target benchmarks
    api.get<TargetSettings>('/reports/target-settings')
      .then((res) => {
        if (res) setTargetSettings(res);
      })
      .catch(() => {});
  }, [user, isManagerOrAdmin]);

  // Fetch report data whenever target user or week changes
  const fetchReport = async (userId: string, weekDate: string) => {
    setLoading(true);
    setNotification(null);
    try {
      const data = await api.get<ReportData>(
        `/reports/weekly-sales/preview?userId=${userId}&weekOf=${weekDate}`
      );
      setReport(data);
    } catch (err: any) {
      setNotification({
        message: err?.message || 'Failed to generate weekly report data.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId && selectedWeekDate) {
      fetchReport(selectedUserId, selectedWeekDate);
    }
  }, [selectedUserId, selectedWeekDate]);

  // Save report (Draft or Submit)
  const handleSave = async (submit = false) => {
    if (!report) return;
    setSaving(true);
    setNotification(null);
    try {
      const payload = {
        ...report,
        userId: selectedUserId,
        status: submit ? 'SUBMITTED' : report.status || 'DRAFT',
        repSignedAt: submit ? new Date().toISOString() : report.repSignedAt,
      };

      const saved = await api.post<any>('/reports/weekly-sales', payload);
      setReport((prev) => prev ? { ...prev, ...saved, status: payload.status } : null);
      setNotification({
        message: submit
          ? 'Weekly Sales Report submitted successfully! Management has been notified.'
          : 'Draft saved successfully.',
        type: 'success',
      });
    } catch (err: any) {
      setNotification({
        message: err?.message || 'Failed to save report.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Save ongoing target settings
  const handleSaveTargets = async () => {
    try {
      await api.put('/reports/target-settings', targetSettings);
      setTargetModalOpen(false);
      setNotification({ message: 'Target benchmarks updated successfully!', type: 'success' });
      // Apply new targets to current report KPIs if user wishes
      if (report) {
        setReport({
          ...report,
          kpis: report.kpis.map((k) => {
            if (k.key === 'leads') return { ...k, target: targetSettings.leads };
            if (k.key === 'meetings') return { ...k, target: targetSettings.meetings };
            if (k.key === 'proposals') return { ...k, target: targetSettings.proposals };
            if (k.key === 'dealsClosed') return { ...k, target: targetSettings.dealsClosed };
            if (k.key === 'revenueGhc') return { ...k, target: targetSettings.revenueGhc };
            return k;
          }),
        });
      }
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to save targets.', type: 'error' });
    }
  };

  // Trigger browser print (PDF export)
  const handlePrint = () => {
    window.print();
  };

  if (!isAuthorized) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#e2e8f0' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginBottom: '12px' }}>
          Access Restricted
        </h2>
        <p style={{ color: '#94a3b8' }}>
          The Weekly Sales Performance Report is only accessible to the Sales Team and Management.
        </p>
      </div>
    );
  }

  return (
    <div className="weekly-report-container" style={{ padding: '24px 28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Print Stylesheet for A4 Multi-page PDF Output */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .sidebar,
          .weekly-report-toolbar,
          .weekly-report-actions,
          .no-print {
            display: none !important;
          }
          .weekly-report-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .report-document {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .report-page {
            page-break-after: always !important;
            break-after: page !important;
            min-height: 98vh;
            padding: 36px 40px !important;
            margin: 0 !important;
            border-bottom: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .report-header-badge {
            background: #15803d !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          td, th {
            border: 1px solid #cbd5e1 !important;
            padding: 10px 14px !important;
          }
          input, textarea, select {
            border: none !important;
            background: transparent !important;
            color: #0f172a !important;
            font-weight: 600 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Top Controls Toolbar (Hidden on Print) */}
      <div className="weekly-report-toolbar no-print" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>📈</span>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Weekly Sales Performance Report
              </h1>
              {report?.status && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background:
                      report.status === 'REVIEWED'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : report.status === 'SUBMITTED'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(234, 179, 8, 0.2)',
                    color:
                      report.status === 'REVIEWED'
                        ? '#4ade80'
                        : report.status === 'SUBMITTED'
                        ? '#60a5fa'
                        : '#facc15',
                    border: `1px solid ${
                      report.status === 'REVIEWED'
                        ? 'rgba(34, 197, 94, 0.4)'
                        : report.status === 'SUBMITTED'
                        ? 'rgba(59, 130, 246, 0.4)'
                        : 'rgba(234, 179, 8, 0.4)'
                    }`,
                  }}
                >
                  {report.status}
                </span>
              )}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Auto-generate, review, and export weekly sales activities, KPIs, and pipeline updates.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => setTargetModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <span>🎯</span>
              <span>Target Benchmarks</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => selectedUserId && fetchReport(selectedUserId, selectedWeekDate)}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <span>⚡</span>
              <span>Re-pull from CRM</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <span>🖨️</span>
              <span>Print / Download PDF</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSave(false)}
              disabled={saving || loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <span>💾</span>
              <span>Save Draft</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSave(true)}
              disabled={saving || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              }}
            >
              <span>🚀</span>
              <span>Submit Report</span>
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Sales Rep Selector (for managers) */}
            {isManagerOrAdmin && salesUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Rep:</span>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{
                    background: '#0a1612',
                    border: '1px solid rgba(22, 163, 74, 0.3)',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Week Date Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Reference Date:</span>
              <input
                type="date"
                value={selectedWeekDate}
                onChange={(e) => setSelectedWeekDate(e.target.value)}
                style={{
                  background: '#0a1612',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                  color: '#ffffff',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              />
            </div>

            {/* Quick Week Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedWeekDate(new Date().toISOString().split('T')[0])}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Current Week
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  setSelectedWeekDate(d.toISOString().split('T')[0]);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Last Week
              </button>
            </div>
          </div>

          {report?.weekLabel && (
            <div style={{ fontSize: '13px', color: '#86efac', fontWeight: 700 }}>
              📅 Period: {report.weekLabel}
            </div>
          )}
        </div>

        {/* Notifications Alert */}
        {notification && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 18px',
              borderRadius: '8px',
              background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${notification.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: notification.type === 'success' ? '#4ade80' : '#f87171',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Target Benchmarks Modal */}
      {targetModalOpen && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(22, 163, 74, 0.3)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px 28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                🎯 Weekly Target Benchmarks
              </h3>
              <button
                onClick={() => setTargetModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              Set ongoing target benchmarks for the sales team. Because targets can change over time, updating these benchmarks will pre-fill future weekly reports while preserving historical submissions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Weekly Leads Generated Target
                </label>
                <input
                  type="text"
                  value={targetSettings.leads}
                  onChange={(e) => setTargetSettings({ ...targetSettings, leads: e.target.value })}
                  placeholder="e.g. 10"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Weekly Meetings Held Target
                </label>
                <input
                  type="text"
                  value={targetSettings.meetings}
                  onChange={(e) => setTargetSettings({ ...targetSettings, meetings: e.target.value })}
                  placeholder="e.g. 5"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Weekly Proposals Submitted Target
                </label>
                <input
                  type="text"
                  value={targetSettings.proposals}
                  onChange={(e) => setTargetSettings({ ...targetSettings, proposals: e.target.value })}
                  placeholder="e.g. 3"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Weekly Deals Closed Target
                </label>
                <input
                  type="text"
                  value={targetSettings.dealsClosed}
                  onChange={(e) => setTargetSettings({ ...targetSettings, dealsClosed: e.target.value })}
                  placeholder="e.g. 2"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Weekly Revenue Target (GHC)
                </label>
                <input
                  type="text"
                  value={targetSettings.revenueGhc}
                  onChange={(e) => setTargetSettings({ ...targetSettings, revenueGhc: e.target.value })}
                  placeholder="e.g. 25000"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ffffff', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="ghost" onClick={() => setTargetModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveTargets}>
                Save Target Benchmarks
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading || !report ? (
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <Spinner />
          <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '15px' }}>
            Aggregating CRM activities, pipeline, and payments for {selectedWeekDate}…
          </p>
        </div>
      ) : (
        /* The Branded 7-Section Document */
        <div
          className="report-document"
          style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
          }}
        >
          {/* ================================================================ */}
          {/* PAGE 1: COVER HEADER                                              */}
          {/* ================================================================ */}
          <div
            className="report-page"
            style={{
              padding: '60px 48px',
              borderBottom: '2px dashed #e2e8f0',
              minHeight: '650px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Logo & Slogan Header */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '80px' }}>
                <div style={{ textAlign: 'right' }}>
                  <img
                    src="/logo.png"
                    alt="Sunseekers Tours"
                    style={{ height: '70px', width: 'auto', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>
                    Sunseekers Tours
                  </div>
                  <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#ea580c', marginTop: '1px' }}>
                    ...Memories of our Tours are Forever
                  </div>
                </div>
              </div>

              {/* Title Block */}
              <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '80px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '16px' }}>
                  Sunseekers Tours
                </h2>
                <h1 style={{ fontSize: '38px', fontWeight: 900, color: '#15803d', letterSpacing: '-1px', lineHeight: 1.2 }}>
                  Weekly Sales Performance<br />Report
                </h1>
              </div>
            </div>

            {/* Rep Metadata Card */}
            <div
              style={{
                maxWidth: '480px',
                margin: '0 auto',
                width: '100%',
                background: '#f8fafc',
                padding: '24px 32px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ width: '130px', fontWeight: 700, color: '#475569', fontSize: '15px' }}>Rep Name:</span>
                <input
                  type="text"
                  value={report.repName}
                  onChange={(e) => setReport({ ...report, repName: e.target.value })}
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    border: 'none',
                    borderBottom: '1px solid #94a3b8',
                    padding: '4px 0',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ width: '130px', fontWeight: 700, color: '#475569', fontSize: '15px' }}>Week of:</span>
                <input
                  type="text"
                  value={report.weekLabel}
                  onChange={(e) => setReport({ ...report, weekLabel: e.target.value })}
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    border: 'none',
                    borderBottom: '1px solid #94a3b8',
                    padding: '4px 0',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '130px', fontWeight: 700, color: '#475569', fontSize: '15px' }}>Manager:</span>
                <input
                  type="text"
                  value={report.managerName}
                  onChange={(e) => setReport({ ...report, managerName: e.target.value })}
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    border: 'none',
                    borderBottom: '1px solid #94a3b8',
                    padding: '4px 0',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* PAGE 2: SECTION 1 – WEEKLY ACTIVITY SUMMARY                       */}
          {/* ================================================================ */}
          <div className="report-page" style={{ padding: '48px', borderBottom: '2px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span className="report-header-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
                SECTION 1
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Weekly Activity Summary
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              Log your key activities for the week. (Auto-calculated from logged CRM interactions and editable).
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '55%' }}>Activity</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '45%' }}>Count / Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Calls / Emails / Visits</td>
                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="text"
                      value={report.activitySummary.callsEmailsVisitsFormatted || `${report.activitySummary.calls} / ${report.activitySummary.emails} / ${report.activitySummary.visits}`}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          activitySummary: { ...report.activitySummary, callsEmailsVisitsFormatted: e.target.value },
                        })
                      }
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 700, outline: 'none' }}
                    />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>New Prospects Engaged</td>
                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="number"
                      value={report.activitySummary.newProspectsEngaged}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          activitySummary: { ...report.activitySummary, newProspectsEngaged: Number(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 700, outline: 'none' }}
                    />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Meetings Held</td>
                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="number"
                      value={report.activitySummary.meetingsHeld}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          activitySummary: { ...report.activitySummary, meetingsHeld: Number(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 700, outline: 'none' }}
                    />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Proposals Submitted</td>
                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="number"
                      value={report.activitySummary.proposalsSubmitted}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          activitySummary: { ...report.activitySummary, proposalsSubmitted: Number(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 700, outline: 'none' }}
                    />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Follow-Ups Completed (48–72 hrs)</td>
                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="number"
                      value={report.activitySummary.followUpsCompleted}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          activitySummary: { ...report.activitySummary, followUpsCompleted: Number(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 700, outline: 'none' }}
                    />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Deals Closed</td>
                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="number"
                      value={report.activitySummary.dealsClosed}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          activitySummary: { ...report.activitySummary, dealsClosed: Number(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 700, outline: 'none' }}
                    />
                  </td>
                </tr>

                <tr style={{ borderBottom: '2px solid #0f172a', background: '#ffffff' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#15803d' }}>Revenue Collected (GHC)</td>
                  <td style={{ padding: '14px 16px' }}>
                    <input
                      type="number"
                      value={report.activitySummary.revenueCollectedGhc}
                      onChange={(e) =>
                        setReport({
                          ...report,
                          activitySummary: { ...report.activitySummary, revenueCollectedGhc: Number(e.target.value) },
                        })
                      }
                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 800, color: '#15803d', outline: 'none' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ================================================================ */}
          {/* PAGE 3: SECTION 2 – WEEKLY KPIS (FLEXIBLE TARGETS & ACTUALS)     */}
          {/* ================================================================ */}
          <div className="report-page" style={{ padding: '48px', borderBottom: '2px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="report-header-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
                  SECTION 2
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Weekly KPIs
                </h2>
              </div>
              <span className="no-print" style={{ fontSize: '12px', color: '#64748b' }}>
                💡 Target fields are flexible and can be customized per report.
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '40%' }}>KPI</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '30%' }}>Target</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '30%' }}>Actual</th>
                </tr>
              </thead>
              <tbody>
                {report.kpis.map((kpi, idx) => {
                  const isRevenue = kpi.key === 'revenueGhc';
                  return (
                    <tr
                      key={kpi.key}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{kpi.label}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isRevenue && <span style={{ fontWeight: 700, color: '#475569' }}>GHC</span>}
                          <input
                            type="text"
                            value={kpi.target}
                            placeholder="—"
                            onChange={(e) => {
                              const updatedKpis = [...report.kpis];
                              updatedKpis[idx].target = e.target.value;
                              setReport({ ...report, kpis: updatedKpis });
                            }}
                            style={{
                              width: '100%',
                              border: 'none',
                              borderBottom: '1px solid #cbd5e1',
                              padding: '4px 6px',
                              fontWeight: 700,
                              outline: 'none',
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isRevenue && <span style={{ fontWeight: 700, color: '#15803d' }}>GHC</span>}
                          <input
                            type="number"
                            value={kpi.actual}
                            onChange={(e) => {
                              const updatedKpis = [...report.kpis];
                              updatedKpis[idx].actual = Number(e.target.value);
                              setReport({ ...report, kpis: updatedKpis });
                            }}
                            style={{
                              width: '100%',
                              border: 'none',
                              borderBottom: '1px solid #cbd5e1',
                              padding: '4px 6px',
                              fontWeight: 800,
                              color: isRevenue ? '#15803d' : '#0f172a',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ================================================================ */}
          {/* PAGE 4: SECTION 3 – PIPELINE UPDATE                               */}
          {/* ================================================================ */}
          <div className="report-page" style={{ padding: '48px', borderBottom: '2px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="report-header-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
                SECTION 3
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Pipeline Update
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              List your active deals below.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '13px', width: '30%' }}>Client / Opportunity</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '13px', width: '22%' }}>Stage</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '13px', width: '28%' }}>Next Action</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '13px', width: '20%' }}>Est. Value (GHC)</th>
                </tr>
              </thead>
              <tbody>
                {report.pipelineDeals.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No active pipeline deals found. Add one below.
                    </td>
                  </tr>
                ) : (
                  report.pipelineDeals.map((deal, idx) => (
                    <tr
                      key={deal.id || idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="text"
                          value={deal.clientOpportunity}
                          onChange={(e) => {
                            const updated = [...report.pipelineDeals];
                            updated[idx].clientOpportunity = e.target.value;
                            setReport({ ...report, pipelineDeals: updated });
                          }}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 600, outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="text"
                          value={deal.stage}
                          onChange={(e) => {
                            const updated = [...report.pipelineDeals];
                            updated[idx].stage = e.target.value;
                            setReport({ ...report, pipelineDeals: updated });
                          }}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 600, outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="text"
                          value={deal.nextAction}
                          onChange={(e) => {
                            const updated = [...report.pipelineDeals];
                            updated[idx].nextAction = e.target.value;
                            setReport({ ...report, pipelineDeals: updated });
                          }}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="number"
                          value={deal.estValueGhc}
                          onChange={(e) => {
                            const updated = [...report.pipelineDeals];
                            updated[idx].estValueGhc = Number(e.target.value);
                            setReport({ ...report, pipelineDeals: updated });
                          }}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Quick Add Deal Row */}
            <div className="no-print" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Client / Opportunity"
                value={newDeal.clientOpportunity}
                onChange={(e) => setNewDeal({ ...newDeal, clientOpportunity: e.target.value })}
                style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Stage"
                value={newDeal.stage}
                onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                style={{ width: '140px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Next Action"
                value={newDeal.nextAction}
                onChange={(e) => setNewDeal({ ...newDeal, nextAction: e.target.value })}
                style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
              <input
                type="number"
                placeholder="Est. Value (GHC)"
                value={newDeal.estValueGhc || ''}
                onChange={(e) => setNewDeal({ ...newDeal, estValueGhc: Number(e.target.value) })}
                style={{ width: '140px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!newDeal.clientOpportunity) return;
                  setReport({
                    ...report,
                    pipelineDeals: [...report.pipelineDeals, newDeal],
                  });
                  setNewDeal({ clientOpportunity: '', stage: 'Prospect', nextAction: '', estValueGhc: 0 });
                }}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                + Add Deal
              </Button>
            </div>

            <div style={{ marginTop: '24px', fontSize: '12px', color: '#64748b' }}>
              <strong>Stages:</strong> Prospect → Qualified → Proposal Sent → Negotiation → Committed → Closed
            </div>
          </div>

          {/* ================================================================ */}
          {/* PAGE 5: SECTION 4 – WINS, BLOCKERS & LEARNINGS                    */}
          {/* ================================================================ */}
          <div className="report-page" style={{ padding: '48px', borderBottom: '2px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span className="report-header-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
                SECTION 4
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Wins, Blockers & Learnings
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              {/* This Week's Wins */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏆</span> This Week's Wins
                </h3>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '160px' }}>
                  {report.wins.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No wins listed yet.</p>
                  ) : (
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {report.wins.map((win, idx) => (
                        <li key={idx} style={{ marginBottom: '8px', color: '#1e293b', fontSize: '14px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{win}</span>
                            <button
                              className="no-print"
                              onClick={() => {
                                const updated = report.wins.filter((_, i) => i !== idx);
                                setReport({ ...report, wins: updated });
                              }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="no-print" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Add a win..."
                      value={newWin}
                      onChange={(e) => setNewWin(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newWin.trim()) {
                          setReport({ ...report, wins: [...report.wins, newWin.trim()] });
                          setNewWin('');
                        }
                      }}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (!newWin.trim()) return;
                        setReport({ ...report, wins: [...report.wins, newWin.trim()] });
                        setNewWin('');
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Blockers & Risks */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span> Blockers & Risks
                </h3>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '160px' }}>
                  {report.blockers.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No blockers or risks logged.</p>
                  ) : (
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {report.blockers.map((blocker, idx) => (
                        <li key={idx} style={{ marginBottom: '8px', color: '#1e293b', fontSize: '14px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{blocker}</span>
                            <button
                              className="no-print"
                              onClick={() => {
                                const updated = report.blockers.filter((_, i) => i !== idx);
                                setReport({ ...report, blockers: updated });
                              }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="no-print" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Add a blocker or risk..."
                      value={newBlocker}
                      onChange={(e) => setNewBlocker(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBlocker.trim()) {
                          setReport({ ...report, blockers: [...report.blockers, newBlocker.trim()] });
                          setNewBlocker('');
                        }
                      }}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (!newBlocker.trim()) return;
                        setReport({ ...report, blockers: [...report.blockers, newBlocker.trim()] });
                        setNewBlocker('');
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Learning */}
            <div style={{ marginTop: '24px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                Key learning this week:
              </label>
              <textarea
                rows={3}
                value={report.keyLearning}
                onChange={(e) => setReport({ ...report, keyLearning: e.target.value })}
                placeholder="What was your biggest insight or lesson learned this week?"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  background: '#f8fafc',
                }}
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* PAGE 6: SECTION 5 – NEXT WEEK'S COMMITMENTS                       */}
          {/* ================================================================ */}
          <div className="report-page" style={{ padding: '48px', borderBottom: '2px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="report-header-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
                SECTION 5
              </span>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Next Week's Commitments
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              List your top priorities for next week.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '50%' }}>Commitment</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '25%' }}>Owner</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '25%' }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {report.commitments.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No commitments listed yet. Add top priorities below.
                    </td>
                  </tr>
                ) : (
                  report.commitments.map((c, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="text"
                          value={c.commitment}
                          onChange={(e) => {
                            const updated = [...report.commitments];
                            updated[idx].commitment = e.target.value;
                            setReport({ ...report, commitments: updated });
                          }}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 600, outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="text"
                          value={c.owner}
                          onChange={(e) => {
                            const updated = [...report.commitments];
                            updated[idx].owner = e.target.value;
                            setReport({ ...report, commitments: updated });
                          }}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 600, outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="date"
                          value={c.dueDate}
                          onChange={(e) => {
                            const updated = [...report.commitments];
                            updated[idx].dueDate = e.target.value;
                            setReport({ ...report, commitments: updated });
                          }}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', outline: 'none' }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Quick Add Commitment Row */}
            <div className="no-print" style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="New commitment / priority"
                value={newCommitment.commitment}
                onChange={(e) => setNewCommitment({ ...newCommitment, commitment: e.target.value })}
                style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Owner"
                value={newCommitment.owner || report.repName}
                onChange={(e) => setNewCommitment({ ...newCommitment, owner: e.target.value })}
                style={{ width: '160px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
              <input
                type="date"
                value={newCommitment.dueDate}
                onChange={(e) => setNewCommitment({ ...newCommitment, dueDate: e.target.value })}
                style={{ width: '160px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!newCommitment.commitment) return;
                  setReport({
                    ...report,
                    commitments: [...report.commitments, { ...newCommitment, owner: newCommitment.owner || report.repName }],
                  });
                  setNewCommitment({ commitment: '', owner: report.repName, dueDate: '' });
                }}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                + Add Commitment
              </Button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* PAGE 7: SECTION 6 – SUMMARY & SIGN-OFF                            */}
          {/* ================================================================ */}
          <div className="report-page" style={{ padding: '48px', minHeight: '650px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span className="report-header-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
                  SECTION 6
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Summary & Sign-Off
                </h2>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '40px' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '40%' }}>Field</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', width: '60%' }}>Your Entry</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Overall performance this week</td>
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="text"
                        value={report.overallPerformance}
                        placeholder="e.g. Exceeded Target / Satisfactory / Needs Attention"
                        onChange={(e) => setReport({ ...report, overallPerformance: e.target.value })}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}
                      />
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Key win to highlight</td>
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="text"
                        value={report.keyWinHighlight}
                        placeholder="e.g. Closed corporate safari package"
                        onChange={(e) => setReport({ ...report, keyWinHighlight: e.target.value })}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}
                      />
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Support needed from manager</td>
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="text"
                        value={report.supportNeeded}
                        placeholder="e.g. Approval on special quote discount for embassy client"
                        onChange={(e) => setReport({ ...report, supportNeeded: e.target.value })}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', outline: 'none' }}
                      />
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>Projected revenue next week (GHC)</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#15803d' }}>GHC</span>
                        <input
                          type="number"
                          value={report.projectedRevenueGhc}
                          onChange={(e) => setReport({ ...report, projectedRevenueGhc: Number(e.target.value) })}
                          style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', fontWeight: 800, color: '#15803d', outline: 'none' }}
                        />
                      </div>
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '2px solid #0f172a', background: '#ffffff' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                      On track for monthly target? (Yes / Behind / Ahead)
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={report.onTrackStatus}
                        onChange={(e) => setReport({ ...report, onTrackStatus: e.target.value })}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom: '1px solid #cbd5e1',
                          fontWeight: 700,
                          outline: 'none',
                          background: 'transparent',
                        }}
                      >
                        <option value="Ahead">Ahead</option>
                        <option value="On Track">On Track (Yes)</option>
                        <option value="Behind">Behind</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sign-Off & Verification Block */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px 32px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Submitted by Sales Representative
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  {report.repName}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Signed: {report.repSignedAt ? new Date(report.repSignedAt).toLocaleDateString() : 'Draft — Pending Submission'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Manager Review & Sign-Off
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: report.status === 'REVIEWED' ? '#15803d' : '#475569', marginTop: '6px' }}>
                  {report.managerName} {report.status === 'REVIEWED' ? '✓ (Approved)' : '(Pending)'}
                </div>
                {report.managerNotes && (
                  <div style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', marginTop: '6px' }}>
                    "{report.managerNotes}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
