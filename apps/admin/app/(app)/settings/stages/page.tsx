'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/ui';

export interface SalesStageItem {
  id: string;
  key: string;
  name: string;
  color: string;
  order: number;
  description?: string;
}

export const DEFAULT_STAGES: SalesStageItem[] = [
  { id: 'stage-1', key: 'NEW', name: 'Initial Inquiry', color: '#0284c7', order: 1, description: 'Fresh travel inquiry or tour request' },
  { id: 'stage-2', key: 'CONTACTED', name: 'Contacted & Discovery', color: '#8b5cf6', order: 2, description: 'Spoke with traveler, gathering preferences & dates' },
  { id: 'stage-3', key: 'QUALIFIED', name: 'Qualified & Itinerary', color: '#06b6d4', order: 3, description: 'Dates, passenger count, and route confirmed' },
  { id: 'stage-4', key: 'PROPOSAL', name: 'Custom Quote Sent', color: '#f59e0b', order: 4, description: 'Official quote (QTE-...) or proposal delivered' },
  { id: 'stage-5', key: 'NEGOTIATION', name: 'Negotiation & Fleet Selection', color: '#ec4899', order: 5, description: 'Adjusting itinerary, hotel, or car choices' },
  { id: 'stage-6', key: 'DEPOSIT', name: 'Awaiting Deposit', color: '#d97706', order: 6, description: 'Itinerary accepted, awaiting payment' },
  { id: 'stage-7', key: 'WON', name: 'Confirmed Booking (Won)', color: '#10b981', order: 7, description: 'Payment confirmed, tour booking locked in' },
  { id: 'stage-8', key: 'LOST', name: 'Lost / Cancelled', color: '#ef4444', order: 8, description: 'Client cancelled or chose alternate option' },
];

const PRESET_COLORS = [
  { label: 'Sky Blue', hex: '#0284c7' },
  { label: 'Indigo Purple', hex: '#8b5cf6' },
  { label: 'Cyan Teal', hex: '#06b6d4' },
  { label: 'Amber Gold', hex: '#f59e0b' },
  { label: 'Pink Rose', hex: '#ec4899' },
  { label: 'Deep Orange', hex: '#d97706' },
  { label: 'Emerald Green', hex: '#10b981' },
  { label: 'Slate Gray', hex: '#64748b' },
  { label: 'Crimson Red', hex: '#ef4444' },
];

export default function SalesStagesSetupPage() {
  const [stages, setStages] = useState<SalesStageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit/Create Modal State
  const [editingStage, setEditingStage] = useState<SalesStageItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formColor, setFormColor] = useState('#0284c7');
  const [formDesc, setFormDesc] = useState('');

  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SalesStageItem[]>('/deals/stages');
      if (Array.isArray(data) && data.length > 0) {
        setStages(data.sort((a, b) => a.order - b.order));
      } else {
        setStages(DEFAULT_STAGES);
      }
    } catch {
      setStages(DEFAULT_STAGES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStages();
  }, [loadStages]);

  const handleSaveAll = async (stagesToSave: SalesStageItem[]) => {
    setSaving(true);
    setNotice(null);
    try {
      await api.put('/deals/stages', { stages: stagesToSave });
      setNotice({ type: 'success', message: 'Sales stages successfully saved and aligned across CRM & Admin!' });
      setStages(stagesToSave);
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Failed to save sales stages' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreate = () => {
    setIsNew(true);
    setFormName('');
    setFormKey(`CUSTOM_${Date.now().toString().slice(-4)}`);
    setFormColor('#0284c7');
    setFormDesc('');
    setEditingStage({
      id: `stage-${Date.now()}`,
      key: `CUSTOM_${Date.now().toString().slice(-4)}`,
      name: '',
      color: '#0284c7',
      order: stages.length + 1,
      description: '',
    });
  };

  const handleOpenEdit = (stage: SalesStageItem) => {
    setIsNew(false);
    setFormName(stage.name);
    setFormKey(stage.key);
    setFormColor(stage.color || '#0284c7');
    setFormDesc(stage.description || '');
    setEditingStage(stage);
  };

  const handleSaveModal = () => {
    if (!formName.trim()) {
      alert('Please enter a Stage Name');
      return;
    }
    const cleanKey = formKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_') || `STAGE_${Date.now().toString().slice(-4)}`;

    let updatedList: SalesStageItem[];
    if (isNew) {
      const newStage: SalesStageItem = {
        id: editingStage?.id || `stage-${Date.now()}`,
        key: cleanKey,
        name: formName.trim(),
        color: formColor,
        order: stages.length + 1,
        description: formDesc.trim(),
      };
      updatedList = [...stages, newStage];
    } else {
      updatedList = stages.map((s) =>
        s.id === editingStage?.id
          ? {
              ...s,
              name: formName.trim(),
              key: cleanKey,
              color: formColor,
              description: formDesc.trim(),
            }
          : s
      );
    }

    setEditingStage(null);
    void handleSaveAll(updatedList);
  };

  const handleDeleteStage = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the sales stage "${name}"?`)) {
      return;
    }
    const filtered = stages.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 }));
    void handleSaveAll(filtered);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const copy = [...stages];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    void handleSaveAll(reordered);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset all sales stages to Sunseekers default travel stages?')) return;
    void handleSaveAll(DEFAULT_STAGES);
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeader
        title="🎯 Sales Stages Configuration"
        subtitle="Customize the sales stages through which customers and inquiries progress across your Leads and Sales Pipeline."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/crm/deals">
              <Button variant="secondary">💼 View Sales Stages (Deals)</Button>
            </Link>
            <Button variant="primary" onClick={handleOpenCreate}>
              ➕ Add New Sales Stage
            </Button>
          </div>
        }
      />

      {notice && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            background: notice.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: notice.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${notice.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{notice.message}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Card */}
      <Card style={{ padding: '20px 24px', marginBottom: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              How Sales Stages Work in Sunseekers CRM
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Stages defined here automatically control the columns on the <strong>Sales Stages (Deals)</strong> board and the status options on the <strong>Leads</strong> board. Reordering stages updates the progression workflow for your sales agents.
            </p>
          </div>
          <Button variant="ghost" onClick={handleResetDefaults} disabled={saving} style={{ fontSize: '12px' }}>
            🔄 Reset to Standard Travel Stages
          </Button>
        </div>
      </Card>

      {/* Stages List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Spinner size={32} />
          <p style={{ marginTop: '12px', fontSize: '14px', color: '#64748b' }}>Loading sales stages…</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stages.map((stage, idx) => (
            <Card
              key={stage.id}
              style={{
                padding: '16px 20px',
                borderLeft: `5px solid ${stage.color || '#0284c7'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                  }}
                >
                  {idx + 1}
                </span>

                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    background: stage.color || '#0284c7',
                    boxShadow: '0 0 6px rgba(0,0,0,0.15)',
                  }}
                  title={`Color: ${stage.color}`}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                      {stage.name}
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                      {stage.key}
                    </span>
                  </div>
                  {stage.description && (
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      {stage.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Order and Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0 || saving}
                  title="Move stage up"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                    opacity: idx === 0 ? 0.4 : 1,
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === stages.length - 1 || saving}
                  title="Move stage down"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    cursor: idx === stages.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: idx === stages.length - 1 ? 0.4 : 1,
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  ▼
                </button>
                <Button variant="secondary" onClick={() => handleOpenEdit(stage)} style={{ fontSize: '13px', padding: '6px 14px' }}>
                  ✏️ Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteStage(stage.id, stage.name)}
                  style={{ fontSize: '13px', color: '#ef4444', padding: '6px 12px' }}
                >
                  🗑️ Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      {editingStage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
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
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {isNew ? '➕ Create New Sales Stage' : `✏️ Edit Sales Stage: ${editingStage.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStage(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Stage Display Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Itinerary Planning or Vehicle Selection"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Internal Code / Key (Uppercase)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ITINERARY_PLANNING"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Maps to underlying CRM stage code.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Stage Badge & Column Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((pc) => (
                    <button
                      key={pc.hex}
                      type="button"
                      onClick={() => setFormColor(pc.hex)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: pc.hex,
                        border: formColor === pc.hex ? '3px solid #0f172a' : '2px solid transparent',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                      title={pc.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{ width: '38px', height: '34px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                    title="Custom Color"
                  />
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#475569' }}>{formColor}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Stage Description / Instructions for Staff
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Confirm traveler dates, passenger count, and accommodation tier before sending quote."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setEditingStage(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveModal}>
                💾 Save Stage
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
