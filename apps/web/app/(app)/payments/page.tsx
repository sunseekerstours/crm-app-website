'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Paginated } from '@/lib/api';
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
import { formatDisplayPhone } from '@/lib/phone';

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
}

interface BookingOption {
  id: string;
  bookingNumber?: string;
  tourName?: string;
  customerId?: string;
  customer?: CustomerOption;
}

interface PaymentItem {
  id: string;
  paymentNumber?: string;
  receiptNumber?: string;
  amount: number | string;
  currency?: string;
  method?: string;
  status?: string;
  reference?: string;
  paidAt?: string | null;
  bookingId?: string;
  booking?: BookingOption;
  customerId?: string;
  customer?: CustomerOption;
  notes?: string;
}

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Credit/Debit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Wire Transfer' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (MTN/Telecel/AirtelTigo)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const STATUSES = [
  { value: 'COMPLETED', label: 'Completed / Paid' },
  { value: 'PENDING', label: 'Pending Verification' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const initialForm = {
  customerId: '',
  bookingId: '',
  amount: '',
  currency: 'USD',
  method: 'CASH',
  status: 'COMPLETED',
  reference: '',
  paidAt: new Date().toISOString().substring(0, 10),
  notes: '',
};

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Paginated<PaymentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(initialForm);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Customer Profile Modal & Printable Stamped Receipt Modal
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [receiptDoc, setReceiptDoc] = useState<PaymentItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '20', page: String(page) });
      if (search.trim()) q.set('search', search.trim());
      const res = await api.get<Paginated<PaymentItem>>(`/payments?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const loadLookups = useCallback(async () => {
    try {
      const bkgRes = await api.get<Paginated<BookingOption>>('/bookings?limit=200');
      setBookings(bkgRes.items ?? []);
    } catch (e) {
      console.error('Failed to load bookings:', e);
    }
    try {
      const custRes = await api.get<Paginated<CustomerOption>>('/customers?limit=200');
      setCustomers(custRes.items ?? []);
    } catch (e) {
      console.error('Failed to load customers:', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  // When a booking is selected in form, auto-fill customer if available
  function handleBookingChange(bkgId: string) {
    setForm((f) => ({ ...f, bookingId: bkgId }));
    if (!bkgId) return;
    const bkg = bookings.find((b) => b.id === bkgId);
    if (bkg?.customer) {
      setForm((f) => ({ ...f, bookingId: bkgId, customerId: bkg.customer?.id || f.customerId }));
      setSelectedCustomerObj({
        id: bkg.customer.id,
        firstName: bkg.customer.firstName,
        lastName: bkg.customer.lastName,
        email: bkg.customer.email,
        phone: bkg.customer.phone,
      });
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        amount: Number(form.amount),
        currency: form.currency,
        method: form.method,
        reference: form.reference.trim() || undefined,
        paidAt: form.paidAt ? new Date(form.paidAt).toISOString() : undefined,
        notes: form.notes.trim() || undefined,
      };

      if (form.customerId) payload.customerId = form.customerId;
      if (form.bookingId) payload.bookingId = form.bookingId;

      await api.post('/payments', payload);
      setForm(initialForm);
      setSelectedCustomerObj(null);
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  // Filter available bookings based on selected customer
  const filteredBookings = form.customerId
    ? bookings.filter((b) => b.customerId === form.customerId || b.customer?.id === form.customerId)
    : bookings;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'grid', gap: '24px', paddingBottom: '60px' }}>
      <PageHeader
        title="💳 Payments &amp; Customer Receipts"
        subtitle="Record payments linked to customers and bookings, and issue official stamped receipts"
      />

      {/* Record Payment Card */}
      <Card title="➕ Record Customer Payment">
        <form onSubmit={create} style={{ display: 'grid', gap: '16px' }}>
          {formError && <div style={{ color: '#b91c1c', fontSize: '13px' }}>⚠️ {formError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Customer Live Search & Tracking */}
            <CustomerSearchPicker
              label="Customer (Payer) *"
              value={form.customerId}
              selectedCustomer={selectedCustomerObj}
              onChange={(custId, cust) => {
                setForm((f) => ({ ...f, customerId: custId }));
                setSelectedCustomerObj(cust);
              }}
              onViewDetails={(custId) => setViewCustomerId(custId)}
              required
            />

            {/* Optional Linked Booking */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Linked Booking Ref (Optional)
              </label>
              <select
                value={form.bookingId}
                onChange={(e) => handleBookingChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#ffffff',
                }}
              >
                <option value="">— Select booking (optional) —</option>
                {filteredBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} {b.tourName ? `• ${b.tourName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount & Currency */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Amount Received *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1500"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                />
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  style={{
                    width: '100px',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#f8fafc',
                    fontWeight: 700,
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Method */}
            <Select
              label="Payment Method *"
              name="method"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              options={METHODS}
            />

            {/* Reference / Momo ID */}
            <Input
              label="Transaction Ref / Momo ID / Cheque #"
              name="reference"
              placeholder="e.g. MTN-9384920 or Cheque #004"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />

            {/* Payment Date */}
            <Input
              label="Payment Date *"
              name="paidAt"
              type="date"
              required
              value={form.paidAt}
              onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setForm(initialForm);
                setSelectedCustomerObj(null);
              }}
            >
              Reset
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Recording Payment…' : '💳 Record Payment & Generate Receipt'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Payments Table & Tracking */}
      <Card
        title="All Customer Payments"
        action={
          <div style={{ position: 'relative', width: '320px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px' }}>
              🔍
            </span>
            <input
              type="search"
              placeholder="Search by customer name, receipt #, or ref…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#f8fafc',
              }}
            />
          </div>
        }
      >
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'receiptNumber',
                  label: 'Receipt #',
                  render: (p: PaymentItem) => (
                    <div>
                      <span style={{ fontWeight: 800, color: '#166534', fontFamily: 'monospace', fontSize: '13px' }}>
                        {p.receiptNumber || p.paymentNumber || p.id.slice(0, 8)}
                      </span>
                      {p.paymentNumber && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Pay: {p.paymentNumber}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'customer',
                  label: 'Customer (Payer)',
                  render: (p: PaymentItem) => {
                    const cust = p.customer || p.booking?.customer;
                    const custName = cust
                      ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim()
                      : 'Unassigned Customer';
                    const initials = cust
                      ? `${cust.firstName?.[0] || ''}${cust.lastName?.[0] || ''}`.toUpperCase() || '👤'
                      : '👤';
                    const custId = cust?.id || p.customerId;

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
                                👁️ View
                              </button>
                            )}
                          </div>
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
                  key: 'amount',
                  label: 'Amount Paid',
                  render: (p: PaymentItem) => (
                    <span style={{ fontWeight: 900, color: '#15803d', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      {p.currency || 'USD'} {(Number(p.amount) || 0).toLocaleString()}
                    </span>
                  ),
                },
                {
                  key: 'method',
                  label: 'Method & Ref',
                  render: (p: PaymentItem) => (
                    <div>
                      <Badge>{p.method?.replace(/_/g, ' ') || 'CASH'}</Badge>
                      {p.reference && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Ref: {p.reference}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'booking',
                  label: 'Linked Booking',
                  render: (p: PaymentItem) =>
                    p.booking ? (
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.booking.bookingNumber}</span>
                        {p.booking.tourName && (
                          <div style={{ color: '#0284c7', fontSize: '11px' }}>{p.booking.tourName}</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Direct Payment</span>
                    ),
                },
                {
                  key: 'paidAt',
                  label: 'Date',
                  render: (p: PaymentItem) => (
                    <span style={{ fontSize: '12px', color: '#334155', whiteSpace: 'nowrap' }}>
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Receipt',
                  render: (p: PaymentItem) => (
                    <button
                      type="button"
                      onClick={() => setReceiptDoc(p)}
                      style={{
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                      }}
                      title="View & Print Official Stamped Receipt"
                    >
                      🧾 Print Receipt
                    </button>
                  ),
                },
              ]}
              rows={data?.items ?? []}
            />
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

      {/* Official Stamped Receipt Printable Modal */}
      {receiptDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setReceiptDoc(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px' }}>
                Official Stamped Receipt: {receiptDoc.receiptNumber || receiptDoc.paymentNumber}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={() => window.print()}>
                  🖨️ Print / Save PDF
                </Button>
                <Button variant="secondary" onClick={() => setReceiptDoc(null)}>
                  ✕ Close
                </Button>
              </div>
            </div>

            <div
              style={{
                padding: '36px',
                overflowY: 'auto',
                background: '#ffffff',
                color: '#0f172a',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #008744', paddingBottom: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#008744' }}>SUNSEEKERS TOURS</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Accra, Ghana • info@sunseekerstours.com</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#166534' }}>OFFICIAL RECEIPT</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace' }}>
                    {receiptDoc.receiptNumber || receiptDoc.paymentNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {receiptDoc.paidAt ? new Date(receiptDoc.paidAt).toLocaleDateString() : new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Customer / Payer Information Box */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>RECEIVED FROM</div>
                {(() => {
                  const cust = receiptDoc.customer || receiptDoc.booking?.customer;
                  return (
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {cust ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim() : 'Valued Customer'}
                      </div>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {cust?.phone && <span>📞 {formatDisplayPhone(cust.phone)}</span>}
                        {cust?.email && <span>✉️ {cust.email}</span>}
                      </div>
                    </div>
                  );
                })()}
                {receiptDoc.booking && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                    For Booking Reference: <strong>{receiptDoc.booking.bookingNumber}</strong> {receiptDoc.booking.tourName ? `• ${receiptDoc.booking.tourName}` : ''}
                  </div>
                )}
              </div>

              {/* Amount Received Box */}
              <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '10px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>AMOUNT RECEIVED</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#15803d', margin: '6px 0' }}>
                  {receiptDoc.currency} {(Number(receiptDoc.amount) || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#166534' }}>
                  Payment Method: <strong>{receiptDoc.method?.replace(/_/g, ' ')}</strong> {receiptDoc.reference ? `• Ref: ${receiptDoc.reference}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Sunseekers Tours Ltd. • GTA Licensed Tour Operator
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ border: '2px solid #008744', color: '#008744', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 900, transform: 'rotate(-4deg)', display: 'inline-block', marginBottom: '6px' }}>
                    ★ PAID &amp; STAMPED ★
                  </div>
                  <div style={{ width: '150px', borderBottom: '1px solid #0f172a', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '11px', fontWeight: 700 }}>Authorized Cashier</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Full Details Modal */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  );
}
