'use client';

import { useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
import { Button, Spinner } from './ui';
import { formatDisplayPhone, parsePhoneNumber } from '@/lib/phone';
import { PhoneBadge } from './PhoneBadge';

export interface CustomerFullDetails {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  address?: string;
  status?: string;
  leadSource?: string;
  preferredLanguage?: string;
  tags?: string[];
  createdAt?: string;
  deals?: { id: string; name?: string; stage?: string; value?: number; currency?: string }[];
  leads?: { id: string; stage?: string; source?: string }[];
  bookings?: { id: string; bookingNumber?: string; tourName?: string; status?: string; totalPrice?: number; currency?: string }[];
}

export function CustomerDetailsModal({
  customerId,
  onClose,
  onAddToStage,
  onCreateBooking,
}: {
  customerId: string | null;
  onClose: () => void;
  onAddToStage?: (customer: CustomerFullDetails) => void;
  onCreateBooking?: (customer: CustomerFullDetails) => void;
}) {
  const [customer, setCustomer] = useState<CustomerFullDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ id: string; content: string; createdAt: string }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stages' | 'bookings' | 'notes'>('overview');

  useEffect(() => {
    if (!customerId) {
      setCustomer(null);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<CustomerFullDetails>(`/customers/${customerId}`),
      api.get<Paginated<any>>(`/notes?customerId=${customerId}`).catch(() => ({ items: [] })),
      api.get<Paginated<any>>(`/bookings?customerId=${customerId}`).catch(() => ({ items: [] })),
      api.get<Paginated<any>>(`/deals?customerId=${customerId}`).catch(() => ({ items: [] })),
    ])
      .then(([custData, notesRes, bookingsRes, dealsRes]) => {
        if (!isMounted) return;
        setCustomer({
          ...custData,
          bookings: bookingsRes.items ?? custData.bookings ?? [],
          deals: dealsRes.items ?? custData.deals ?? [],
        });
        setNotes(notesRes.items ?? []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load customer profile');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  if (!customerId) return null;

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() || !customer) return;
    setSavingNote(true);
    try {
      const created = await api.post<any>(`/customers/${customer.id}/notes`, { content: newNote.trim() });
      setNotes((prev) => [created, ...prev]);
      setNewNote('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  }

  const fullName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Customer Details' : 'Customer Profile';
  const phoneInfo = parsePhoneNumber(customer?.phone, customer?.country);
  const displayPhone = phoneInfo.formatted;
  const cleanPhone = phoneInfo.telUrl;
  const cleanWhatsAppUrl = customer?.whatsapp
    ? parsePhoneNumber(customer.whatsapp, customer?.country).whatsAppUrl
    : phoneInfo.whatsAppUrl;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {customer ? `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase() : '👤'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  {fullName}
                </h2>
                {customer?.status && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      background: customer.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                      color: '#ffffff',
                    }}
                  >
                    {customer.status}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {customer?.country ? `📍 ${customer.country}` : 'Global Traveler'}
                {customer?.leadSource ? ` • Source: ${customer.leadSource}` : ''}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Quick Contact & Action Bar */}
        {customer && (
          <div
            style={{
              padding: '10px 24px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {customer.phone && (
              <a
                href={cleanPhone}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>{phoneInfo.flag}</span> Call {displayPhone}
              </a>
            )}
            {cleanWhatsAppUrl && (
              <a
                href={cleanWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  background: '#25d366',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                💬 WhatsApp
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                ✉️ Email
              </a>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              {onAddToStage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddToStage(customer);
                  }}
                  style={{
                    padding: '5px 12px',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💼 Add to Sales Stage
                </button>
              )}
              {onCreateBooking && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateBooking(customer);
                  }}
                  style={{
                    padding: '5px 12px',
                    background: '#059669',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + New Booking
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 24px' }}>
          {(
            [
              { key: 'overview', label: '📋 Profile Overview' },
              { key: 'stages', label: `💼 Sales Stages (${customer?.deals?.length || 0})` },
              { key: 'bookings', label: `✈️ Bookings (${customer?.bookings?.length || 0})` },
              { key: 'notes', label: `📝 Notes (${notes.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 16px',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #0284c7' : '2px solid transparent',
                background: 'none',
                color: activeTab === tab.key ? '#0284c7' : '#64748b',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Spinner />
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px' }}>Loading customer profile…</p>
            </div>
          ) : error ? (
            <div style={{ padding: '20px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px' }}>
              {error}
            </div>
          ) : customer ? (
            <>
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                      Email Address
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {customer.email || '—'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                      Phone / Mobile
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      {customer.phone ? (
                        <PhoneBadge phone={customer.phone} countryHint={customer.country} showWhatsApp={true} showCall={true} />
                      ) : (
                        <span style={{ fontSize: '14px', color: '#94a3b8' }}>—</span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                      Country & Location
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {customer.country || customer.address || '—'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                      Language
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {customer.preferredLanguage || 'English'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                      Customer Since
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>

                  {customer.tags && customer.tags.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Customer Tags & Segments
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {customer.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              background: '#e2e8f0',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            🏷️ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stages' && (
                <div>
                  {customer.deals && customer.deals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {customer.deals.map((deal) => (
                        <div
                          key={deal.id}
                          style={{
                            padding: '14px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>
                              {deal.name || 'Sales Stage Opportunity'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Value: {deal.value ? `${Number(deal.value).toLocaleString()} ${deal.currency || 'USD'}` : 'Not set'}
                            </span>
                          </div>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                            }}
                          >
                            {deal.stage || 'NEW'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
                      No active sales stages recorded for this customer yet.
                      {onAddToStage && (
                        <div style={{ marginTop: '12px' }}>
                          <Button variant="primary" onClick={() => { onClose(); onAddToStage(customer); }}>
                            + Add to Sales Stage
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'bookings' && (
                <div>
                  {customer.bookings && customer.bookings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {customer.bookings.map((b) => (
                        <div
                          key={b.id}
                          style={{
                            padding: '14px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>
                              {b.tourName || 'Tour Booking'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                              #{b.bookingNumber} • {b.totalPrice != null ? `${b.currency || '$'}${Number(b.totalPrice).toLocaleString()}` : ''}
                            </span>
                          </div>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: b.status === 'CONFIRMED' ? '#f0fdf4' : '#fffbeb',
                              color: b.status === 'CONFIRMED' ? '#166534' : '#b45309',
                            }}
                          >
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
                      No tour bookings recorded for this customer yet.
                      {onCreateBooking && (
                        <div style={{ marginTop: '12px' }}>
                          <Button variant="primary" onClick={() => { onClose(); onCreateBooking(customer); }}>
                            + Create First Booking
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  <form onSubmit={handleAddNote} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Add an internal note about this customer…"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Button type="submit" variant="primary" disabled={savingNote || !newNote.trim()}>
                      {savingNote ? 'Adding…' : '+ Add Note'}
                    </Button>
                  </form>

                  {notes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {notes.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '12px 14px',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>{n.content}</p>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: '20px 0' }}>
                      No notes recorded yet. Add one above!
                    </p>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
