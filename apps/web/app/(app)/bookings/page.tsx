'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import { PhoneBadge } from '@/components/PhoneBadge';
import ProductPackageSelect, { ProductItem } from '@/components/ProductPackageSelect';
import { useAuth } from '@/lib/auth';

interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customer?: { id: string; firstName?: string; lastName?: string; email?: string; phone?: string };
  status: string;
  paxCount: number;
  totalPrice?: number;
  currency: string;
  tourName?: string;
  notes?: string;
  bookedAt?: string;
}

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function BookingsPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.roles?.some((r: string) => ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(r.toUpperCase())));

  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Booking>(`/bookings?page=${page}&limit=10`, [page]);

  // Form state
  const [form, setForm] = useState({
    customerId: '',
    tourName: '',
    paxCount: '1',
    unitPrice: 0,
    totalPrice: '',
    currency: 'USD',
    status: 'PENDING',
    notes: '',
  });

  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirm / Edit Booking Modal State
  const [confirmModalBooking, setConfirmModalBooking] = useState<Booking | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    tourName: '',
    paxCount: 1,
    unitPrice: 0,
    totalPrice: '',
    currency: 'USD',
    status: 'CONFIRMED',
    notes: '',
  });
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setFormError('Please select a customer for this booking.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/bookings', {
        customerId: form.customerId,
        tourName: form.tourName || undefined,
        paxCount: Number(form.paxCount) || 1,
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
        currency: form.currency || 'USD',
        status: form.status,
        notes: form.notes || undefined,
      });

      // Reset form
      setForm({
        customerId: '',
        tourName: '',
        paxCount: '1',
        unitPrice: 0,
        totalPrice: '',
        currency: 'USD',
        status: 'PENDING',
        notes: '',
      });
      setSelectedCustomerObj(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  // Open Confirm / Edit Financials Modal
  function openConfirmModal(b: Booking) {
    setConfirmModalBooking(b);
    setConfirmForm({
      tourName: b.tourName || '',
      paxCount: b.paxCount ?? 1,
      unitPrice: b.totalPrice && b.paxCount ? Number(b.totalPrice) / b.paxCount : 0,
      totalPrice: b.totalPrice != null ? String(b.totalPrice) : '',
      currency: b.currency || 'USD',
      status: b.status || 'CONFIRMED',
      notes: b.notes || '',
    });
  }

  // Submit Confirm / Edit Financials
  async function submitConfirmModal(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmModalBooking) return;
    setConfirmSubmitting(true);
    try {
      await api.patch(`/bookings/${confirmModalBooking.id}`, {
        tourName: confirmForm.tourName || undefined,
        paxCount: Number(confirmForm.paxCount) || 1,
        totalPrice: confirmForm.totalPrice ? Number(confirmForm.totalPrice) : undefined,
        currency: confirmForm.currency,
        status: confirmForm.status,
        notes: confirmForm.notes || undefined,
      });

      alert(`Booking ${confirmModalBooking.bookingNumber} updated successfully!`);
      setConfirmModalBooking(null);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update booking financials');
    } finally {
      setConfirmSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '20px', width: '100%' }}>
      <PageHeader title="Bookings" subtitle="Confirmed and pending reservations with products, packages, & financial controls" />

      {/* NEW BOOKING CARD */}
      <Card title="New booking">
        <form onSubmit={create}>
          {/* Customer Selection */}
          <div style={{ marginBottom: 16 }}>
            <CustomerSearchPicker
              label="Customer *"
              value={form.customerId}
              selectedCustomer={selectedCustomerObj}
              onChange={(custId, cust) => {
                setForm((f) => ({ ...f, customerId: custId }));
                setSelectedCustomerObj(cust);
              }}
              onViewDetails={(custId) => setViewCustomerId(custId)}
              required
            />
          </div>

          {/* Unified Product / Package with Dropdown, Editable Price & Post-Save Lock */}
          <div style={{ marginBottom: 16 }}>
            <ProductPackageSelect
              isBooking={true}
              selectedProductName={form.tourName}
              priceValue={form.unitPrice}
              totalPrice={form.totalPrice}
              currencyValue={form.currency}
              paxCount={form.paxCount}
              isSavedRecord={false}
              isAdmin={isAdmin}
              onSelectProduct={(prod, newPrice, newCurr) => {
                setForm((f) => ({
                  ...f,
                  tourName: prod ? prod.name : '',
                  unitPrice: newPrice != null ? Number(newPrice) : 0,
                  currency: newCurr || f.currency,
                }));
              }}
              onPriceChange={(newPrice) => {
                setForm((f) => ({
                  ...f,
                  unitPrice: Number(newPrice) || 0,
                }));
              }}
              onCurrencyChange={(newCurr) => {
                setForm((f) => ({
                  ...f,
                  currency: newCurr,
                }));
              }}
              onPaxChange={(newPax) => {
                setForm((f) => ({
                  ...f,
                  paxCount: newPax,
                }));
              }}
              onTotalPriceChange={(newTotal) => {
                setForm((f) => ({
                  ...f,
                  totalPrice: newTotal,
                }));
              }}
            />
          </div>

          <div className="form-grid" style={{ marginBottom: 16 }}>
            <Select
              label="Booking Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <Input
              label="Booking Notes / Terms"
              name="notes"
              placeholder="e.g. Flight arrival schedule or dietary requirements"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {formError ? <div className="error-state" style={{ marginBottom: 12 }}>{formError}</div> : null}

          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating Booking…' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </Card>

      {/* BOOKINGS TABLE */}
      <Card title="Bookings &amp; Reservations">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <Table
                columns={[
                  {
                    key: 'bookingNumber',
                    label: 'Booking #',
                    render: (r: Booking) => (
                      <div style={{ minWidth: 100 }}>
                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a', fontSize: 13 }}>{r.bookingNumber}</span>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {r.bookedAt ? new Date(r.bookedAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'customer',
                    label: 'Customer',
                    render: (r: Booking) => {
                      const cust = r.customer;
                      const custName = cust ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim() : '—';
                      const custId = r.customerId ?? cust?.id;
                      const initials = cust ? `${cust.firstName?.[0] || ''}${cust.lastName?.[0] || ''}`.toUpperCase() || '👤' : '👤';

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
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
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{custName}</span>
                            {cust?.phone && (
                              <div style={{ marginTop: 2 }}>
                                <PhoneBadge phone={cust.phone} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'tourName',
                    label: 'Product / Tour',
                    render: (r: Booking) => {
                      const name = r.tourName || '—';
                      let icon = '🎯';
                      const lower = name.toLowerCase();
                      if (lower.includes('tour') || lower.includes('ghana') || lower.includes('castle')) icon = '🌍';
                      else if (lower.includes('fleet') || lower.includes('bus') || lower.includes('car') || lower.includes('rental')) icon = '🚐';
                      else if (lower.includes('hotel') || lower.includes('lodge') || lower.includes('resort')) icon = '🏨';
                      else if (lower.includes('flight') || lower.includes('air')) icon = '✈️';

                      return (
                        <div style={{ minWidth: 140 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span>{icon}</span>
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 12 }}>{name}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{r.paxCount ?? 1} Guest(s)</div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'total',
                    label: 'Financials',
                    render: (r: Booking) => (
                      <div style={{ minWidth: 110 }}>
                        <div style={{ fontWeight: 800, color: '#15803d', fontSize: 13 }}>
                          {r.totalPrice != null ? `${r.currency ?? '$'} ${Number(r.totalPrice).toLocaleString()}` : '—'}
                        </div>
                        {r.totalPrice && r.paxCount && r.paxCount > 1 ? (
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            ({r.currency ?? '$'}{(Number(r.totalPrice) / r.paxCount).toFixed(0)}/pax)
                          </div>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (r: Booking) => {
                      const color = r.status === 'CONFIRMED' ? '#16a34a' : r.status === 'COMPLETED' ? '#0284c7' : r.status === 'CANCELLED' ? '#dc2626' : '#ea580c';
                      return (
                        <Badge>
                          <span style={{ color, fontWeight: 700, fontSize: 11 }}>● {r.status}</span>
                        </Badge>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (r: Booking) => (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setViewBooking(r)}
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
                          title="View complete booking details"
                        >
                          👁️ View
                        </button>
                        <button
                          type="button"
                          onClick={() => openConfirmModal(r)}
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
                rows={data?.items ?? []}
              />
            </div>
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

      {/* VIEW BOOKING DETAILS MODAL */}
      {viewBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
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
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>📋</span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    Booking Details: {viewBooking.bookingNumber}
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Booked on {viewBooking.bookedAt ? new Date(viewBooking.bookedAt).toLocaleString() : 'Recently'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewBooking(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {/* Customer Info Card */}
              <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Customer</div>
                  {viewBooking.customerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewCustomerId(viewBooking.customerId);
                      }}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      👤 Full Customer Profile
                    </button>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                  {viewBooking.customer ? `${viewBooking.customer.firstName ?? ''} ${viewBooking.customer.lastName ?? ''}`.trim() : 'Customer'}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                  {viewBooking.customer?.email && <div>✉️ {viewBooking.customer.email}</div>}
                  {viewBooking.customer?.phone && (
                    <PhoneBadge phone={viewBooking.customer.phone} size="sm" />
                  )}
                </div>
              </div>

              {/* Product & Financials Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>Product / Tour</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{viewBooking.tourName || '—'}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Pax: <strong>{viewBooking.paxCount ?? 1} Guests</strong></div>
                </div>

                <div style={{ padding: 14, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 6 }}>Financials</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#15803d' }}>
                    {viewBooking.totalPrice != null ? `${viewBooking.currency ?? '$'} ${Number(viewBooking.totalPrice).toLocaleString()}` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>
                    Status: <strong>{viewBooking.status}</strong>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewBooking.notes && (
                <div style={{ padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>Notes &amp; Instructions</div>
                  <div style={{ fontSize: 13, color: '#78350f' }}>{viewBooking.notes}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  const b = viewBooking;
                  setViewBooking(null);
                  openConfirmModal(b);
                }}
              >
                ✏️ Edit Financials / Status
              </Button>
              <Button onClick={() => setViewBooking(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM BOOKING & EDIT FINANCIALS MODAL */}
      {confirmModalBooking && (
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
                  Edit Booking &amp; Review Financials
                </h3>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Ref: <strong style={{ fontFamily: 'monospace' }}>{confirmModalBooking.bookingNumber}</strong> • Customer:{' '}
                  <strong>{confirmModalBooking.customer ? `${confirmModalBooking.customer.firstName ?? ''} ${confirmModalBooking.customer.lastName ?? ''}`.trim() : 'Customer'}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalBooking(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitConfirmModal} style={{ display: 'grid', gap: '14px' }}>
              {/* Post-Save Product / Package with pricing permissions */}
              <ProductPackageSelect
                isBooking={true}
                selectedProductName={confirmForm.tourName}
                priceValue={confirmForm.unitPrice}
                totalPrice={confirmForm.totalPrice}
                currencyValue={confirmForm.currency}
                paxCount={confirmForm.paxCount}
                isSavedRecord={true}
                isAdmin={isAdmin}
                onSelectProduct={(prod, newPrice, newCurr) => {
                  setConfirmForm((f) => ({
                    ...f,
                    tourName: prod ? prod.name : '',
                    unitPrice: newPrice != null ? Number(newPrice) : 0,
                    currency: newCurr || f.currency,
                  }));
                }}
                onPriceChange={(newPrice) => {
                  setConfirmForm((f) => ({
                    ...f,
                    unitPrice: Number(newPrice) || 0,
                  }));
                }}
                onCurrencyChange={(newCurr) => {
                  setConfirmForm((f) => ({
                    ...f,
                    currency: newCurr,
                  }));
                }}
                onPaxChange={(newPax) => {
                  setConfirmForm((f) => ({
                    ...f,
                    paxCount: Number(newPax) || 1,
                  }));
                }}
                onTotalPriceChange={(newTotal) => {
                  setConfirmForm((f) => ({
                    ...f,
                    totalPrice: newTotal,
                  }));
                }}
              />

              <Select
                label="Booking Status"
                name="status"
                value={confirmForm.status}
                options={STATUSES.map((st) => ({ value: st, label: st }))}
                onChange={(e) => setConfirmForm({ ...confirmForm, status: e.target.value })}
              />

              <Input
                label="Booking Notes / Financial Terms"
                name="notes"
                placeholder="e.g. 50% deposit received, balance on arrival"
                value={confirmForm.notes}
                onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <Button type="submit" disabled={confirmSubmitting} style={{ flex: 1 }}>
                  {confirmSubmitting ? 'Saving…' : '✓ Save Changes'}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmModalBooking(null)}>
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
