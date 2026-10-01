'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import ProductSearchPicker, { ProductItem } from '@/components/ProductSearchPicker';

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

  const [selectedProductObj, setSelectedProductObj] = useState<ProductItem | null>(null);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
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

  // When a product is selected in New Booking
  function handleProductSelect(prod: ProductItem | null) {
    setSelectedProductObj(prod);
    if (prod) {
      const uPrice = prod.price != null ? Number(prod.price) : 0;
      const pax = Number(form.paxCount) || 1;
      const calcTotal = uPrice > 0 ? (uPrice * pax).toFixed(0) : form.totalPrice;

      setForm((f) => ({
        ...f,
        tourName: prod.name,
        unitPrice: uPrice,
        totalPrice: calcTotal,
        currency: prod.currency || f.currency,
      }));
    }
  }

  // Handle Pax Count Change in New Booking
  function handlePaxChange(val: string) {
    const pax = Number(val) || 1;
    setForm((f) => ({
      ...f,
      paxCount: val,
      totalPrice: f.unitPrice > 0 ? (f.unitPrice * pax).toFixed(0) : f.totalPrice,
    }));
  }

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
      setSelectedProductObj(null);
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
      status: 'CONFIRMED',
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

      alert(`Booking ${confirmModalBooking.bookingNumber} updated successfully! Status set to ${confirmForm.status}.`);
      setConfirmModalBooking(null);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update booking financials');
    } finally {
      setConfirmSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <PageHeader title="Bookings" subtitle="Confirmed and pending reservations with product selection & financial pricing" />

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

          {/* Product Selection with Category Tabs */}
          <div style={{ marginBottom: 16 }}>
            <ProductSearchPicker
              label="Select Available Product / Package (Tours, Fleet Rental, Hotels, Flights)"
              placeholder="🔍 Search available products or click a category tab above..."
              selectedProductName={form.tourName}
              onSelect={handleProductSelect}
            />
          </div>

          {/* Core Booking Fields */}
          <div className="form-grid">
            <Input
              label="Tour / Product Package Name"
              name="tourName"
              placeholder="e.g. Cape Coast & Elmina Castle Tour"
              value={form.tourName}
              onChange={(e) => setForm({ ...form, tourName: e.target.value })}
            />

            <Input
              label="Pax Count (Guests)"
              name="paxCount"
              type="number"
              min="1"
              value={form.paxCount}
              onChange={(e) => handlePaxChange(e.target.value)}
            />

            <Select
              label="Booking Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>

          {/* FINANCIALS & EXPECTED AMOUNT SECTION */}
          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <span style={{ fontWeight: 800, color: '#166534', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Financials &amp; Expected Amount
                </span>
              </div>
              {form.unitPrice > 0 && (
                <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                  Catalog: {form.currency} {form.unitPrice.toLocaleString()} × {form.paxCount} pax = {form.currency} {(form.unitPrice * (Number(form.paxCount) || 1)).toLocaleString()}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'center' }}>
              <Input
                label="Total Expected Price *"
                name="totalPrice"
                type="number"
                placeholder="e.g. 1200"
                value={form.totalPrice}
                onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
              />

              <Select
                label="Currency"
                name="currency"
                value={form.currency}
                options={CURRENCIES}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>ℹ️</span>
              <span>Financials are automatically determined from the selected product. You can freely edit or adjust the total amount where necessary (e.g. discounts, custom group quotes).</span>
            </div>
          </div>

          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}

          <div className="form-actions" style={{ marginTop: 16 }}>
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
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', borderRadius: 8 }}>
              <div style={{ minWidth: 960 }}>
                <Table
                  columns={[
                    {
                      key: 'bookingNumber',
                      label: 'Booking Number',
                      render: (r: Booking) => (
                        <div>
                          <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{r.bookingNumber}</span>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{custName}</span>
                              {custId && (
                                <button
                                  type="button"
                                  onClick={() => setViewCustomerId(custId)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#1d4ed8',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    borderRadius: 4,
                                    padding: '1px 6px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title="View full customer profile"
                                >
                                  👁️ View
                                </button>
                              )}
                              {cust?.phone && <span style={{ fontSize: 11, color: '#64748b' }}>📞 {cust.phone}</span>}
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
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span>{icon}</span>
                              <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{name}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{r.paxCount ?? 1} Guest(s)</div>
                          </div>
                        );
                      },
                    },
                    {
                      key: 'total',
                      label: 'Financials / Total',
                      render: (r: Booking) => (
                        <div>
                          <div style={{ fontWeight: 800, color: '#15803d', fontSize: 14 }}>
                            {r.totalPrice != null ? `${r.currency ?? '$'} ${Number(r.totalPrice).toLocaleString()}` : '—'}
                          </div>
                          {r.totalPrice && r.paxCount && r.paxCount > 1 ? (
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              ({r.currency ?? '$'}{(Number(r.totalPrice) / r.paxCount).toFixed(0)} / pax)
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
                            <span style={{ color, fontWeight: 700 }}>● {r.status}</span>
                          </Badge>
                        );
                      },
                    },
                    {
                      key: 'actions',
                      label: 'Actions & Financials',
                      render: (r: Booking) => (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {r.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => openConfirmModal(r)}
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span>✓</span> Confirm Booking
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openConfirmModal(r)}
                            style={{
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
                            Edit Financials
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  rows={data?.items ?? []}
                />
              </div>
            </div>
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

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
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Confirm Booking &amp; Review Financials
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
              {/* Product selector to change product if needed */}
              <ProductSearchPicker
                label="Assigned Product / Package (Change or Select from Catalog)"
                selectedProductName={confirmForm.tourName}
                onSelect={(prod) => {
                  if (prod) {
                    const uPrice = prod.price != null ? Number(prod.price) : 0;
                    const pax = Number(confirmForm.paxCount) || 1;
                    const calc = uPrice > 0 ? (uPrice * pax).toFixed(0) : confirmForm.totalPrice;
                    setConfirmForm((f) => ({
                      ...f,
                      tourName: prod.name,
                      unitPrice: uPrice,
                      totalPrice: calc,
                      currency: prod.currency || f.currency,
                    }));
                  }
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <Input
                  label="Tour / Package Name"
                  name="tourName"
                  value={confirmForm.tourName}
                  onChange={(e) => setConfirmForm({ ...confirmForm, tourName: e.target.value })}
                />
                <Input
                  label="Pax (Guests)"
                  name="paxCount"
                  type="number"
                  min="1"
                  value={confirmForm.paxCount}
                  onChange={(e) => {
                    const pax = Number(e.target.value) || 1;
                    setConfirmForm((f) => ({
                      ...f,
                      paxCount: pax,
                      totalPrice: f.unitPrice > 0 ? (f.unitPrice * pax).toFixed(0) : f.totalPrice,
                    }));
                  }}
                />
              </div>

              {/* FINANCIALS SECTION IN MODAL */}
              <div
                style={{
                  padding: '12px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontWeight: 800, color: '#166534', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>
                  💵 Financials / Total Amount
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <Input
                    label="Total Price *"
                    name="totalPrice"
                    type="number"
                    value={confirmForm.totalPrice}
                    onChange={(e) => setConfirmForm({ ...confirmForm, totalPrice: e.target.value })}
                    required
                  />
                  <Select
                    label="Currency"
                    name="currency"
                    value={confirmForm.currency}
                    options={CURRENCIES}
                    onChange={(e) => setConfirmForm({ ...confirmForm, currency: e.target.value })}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 6 }}>
                  You can edit this financial price where necessary before confirming.
                </div>
              </div>

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
                  {confirmSubmitting ? 'Saving…' : '✓ Confirm Reservation & Save Financials'}
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
