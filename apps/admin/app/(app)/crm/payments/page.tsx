'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface BookingOption {
  id: string;
  bookingNumber?: string;
  tourName?: string;
}

interface PaymentItem {
  id: string;
  paymentNumber?: string;
  receiptNumber?: string;
  amount?: number | string;
  currency?: string;
  method?: string;
  status?: string;
  reference?: string;
  paidAt?: string;
  bookingId?: string;
  booking?: BookingOption;
  customerId?: string;
  customer?: CustomerOption;
  dealId?: string;
}

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Credit/Debit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Wire Transfer' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (MTN/Vodafone)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];
const STATUSES = ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'];
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
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

export default function CrmPaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Paginated<PaymentItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [bookings, setBookings] = useState<BookingOption[]>([]);

  // Stamped Receipt Print Modal
  const [receiptDoc, setReceiptDoc] = useState<PaymentItem | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '50', page: String(page) });
      if (search) q.set('search', search);
      const res = await api.get<Paginated<PaymentItem>>(`/payments?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api.get<Paginated<CustomerOption>>('/customers?limit=200').then((r) => setCustomers(r.items ?? [])).catch(() => undefined);
    api.get<Paginated<BookingOption>>('/bookings?limit=200').then((r) => setBookings(r.items ?? [])).catch(() => undefined);
  }, []);

  function loadIntoForm(p: PaymentItem) {
    setEditing(p);
    setFormError(null);
    setForm({
      customerId: p.customerId ?? p.customer?.id ?? '',
      bookingId: p.bookingId ?? p.booking?.id ?? '',
      amount: p.amount != null ? String(p.amount) : '',
      currency: p.currency ?? 'USD',
      method: p.method ?? 'CASH',
      status: p.status ?? 'COMPLETED',
      reference: p.reference ?? '',
      paidAt: p.paidAt ? p.paidAt.slice(0, 10) : new Date().toISOString().substring(0, 10),
      notes: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(initialForm);
    setFormError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const body: Record<string, unknown> = {
      customerId: form.customerId || undefined,
      bookingId: form.bookingId || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      currency: form.currency || 'USD',
      method: form.method || undefined,
      status: form.status,
      reference: form.reference || undefined,
      paidAt: form.paidAt || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/payments/${editing.id}`, body);
      } else {
        await api.post('/payments', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(p: PaymentItem) {
    if (!window.confirm(`Delete payment #${p.paymentNumber || p.id}? This cannot be undone.`)) return;
    try {
      await api.delete(`/payments/${p.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function customerLabel(c: CustomerOption) {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    return name || c.email || c.id;
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        title="Payment Transactions & Receipts"
        subtitle={editing ? `Edit Payment: ${editing.paymentNumber}` : 'Record customer payments and print official stamped receipts'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <Button variant="secondary" onClick={reset}>
                Cancel Edit
              </Button>
            ) : null}
            <Button
              onClick={() => {
                reset();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              + Record Payment
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit Payment #${editing.paymentNumber}` : 'Record Customer Payment'}>
        {formError && <ErrorState message={formError} />}

        <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
          <div className="form-grid">
            <Select
              label="Customer (Payer)"
              name="customerId"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              options={[{ value: '', label: '— Select customer —' }, ...customers.map((c) => ({ value: c.id, label: customerLabel(c) }))]}
            />

            <Select
              label="Linked Booking (Optional)"
              name="bookingId"
              value={form.bookingId}
              onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
              options={[{ value: '', label: '— Select booking —' }, ...bookings.map((b) => ({ value: b.id, label: `${b.bookingNumber} ${b.tourName ? `(${b.tourName})` : ''}` }))]}
            />

            <Input
              label="Amount Received *"
              name="amount"
              type="number"
              required
              value={form.amount}
              placeholder="1500"
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />

            <Select
              label="Currency"
              name="currency"
              value={form.currency}
              options={CURRENCIES}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />

            <Select
              label="Payment Method"
              name="method"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              options={METHODS}
            />

            <Input
              label="Transaction Ref / Momo ID / Cheque #"
              name="reference"
              value={form.reference}
              placeholder="e.g. TXN-839482"
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />

            <Input
              label="Payment Date"
              name="paidAt"
              type="date"
              value={form.paidAt}
              onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
            />

            <Select
              label="Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Recording Payment…' : editing ? 'Update Payment' : 'Record Payment & Generate Receipt'}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Payments Table */}
      {error && <ErrorState message={error} />}
      {data ? (
        <Card
          title="All Payment Transactions"
          action={
            <input
              type="search"
              placeholder="Search by receipt # or customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          }
        >
          <Table<PaymentItem>
            keyOf={(p) => p.id}
            rows={data.items}
            columns={[
              {
                key: 'receiptNumber',
                label: 'Receipt #',
                render: (p) => (
                  <div>
                    <span style={{ fontWeight: '800', color: '#166534', fontFamily: 'monospace' }}>
                      {p.receiptNumber || p.paymentNumber || p.id.substring(0, 8)}
                    </span>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Pay #: {p.paymentNumber ?? '—'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Customer / Payer',
                render: (p) =>
                  p.customer ? (
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {`${p.customer.firstName ?? ''} ${p.customer.lastName ?? ''}`.trim() || 'Customer'}
                      </div>
                      {p.customer.email && <div style={{ fontSize: '11px', color: '#64748b' }}>{p.customer.email}</div>}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  ),
              },
              {
                key: 'amount',
                label: 'Amount Paid',
                render: (p) => (
                  <span style={{ fontWeight: '900', color: '#16a34a', fontSize: '15px' }}>
                    {p.currency ?? '$'} {(Number(p.amount) || 0).toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'method',
                label: 'Method & Ref',
                render: (p) => (
                  <div>
                    <Badge>{p.method?.replace('_', ' ') ?? '—'}</Badge>
                    {p.reference && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Ref: {p.reference}</div>}
                  </div>
                ),
              },
              {
                key: 'paidAt',
                label: 'Date',
                render: (p) => (p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'),
              },
              {
                key: 'booking',
                label: 'Booking',
                render: (p) => p.booking?.bookingNumber ?? '—',
              },
              {
                key: 'receipt',
                label: 'Official Receipt',
                render: (p) => (
                  <Button variant="secondary" onClick={() => setReceiptDoc(p)}>
                    🧾 Print Receipt
                  </Button>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (p) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" onClick={() => loadIntoForm(p)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(p)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </Card>
      ) : (
        <Spinner />
      )}

      {/* Stamped Receipt Printable Modal */}
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
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
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
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>
                Official Receipt: {receiptDoc.receiptNumber || receiptDoc.paymentNumber}
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
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#008744' }}>SUNSEEKERS TOURS</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Accra, Ghana • info@sunseekerstours.com</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#166534' }}>OFFICIAL RECEIPT</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace' }}>
                    {receiptDoc.receiptNumber || receiptDoc.paymentNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {receiptDoc.paidAt ? new Date(receiptDoc.paidAt).toLocaleDateString() : new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>RECEIVED FROM</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {receiptDoc.customer ? `${receiptDoc.customer.firstName} ${receiptDoc.customer.lastName}` : 'Valued Customer'}
                </div>
                {receiptDoc.booking && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                    For Booking Ref: <strong>{receiptDoc.booking.bookingNumber}</strong> {receiptDoc.booking.tourName ? `(${receiptDoc.booking.tourName})` : ''}
                  </div>
                )}
              </div>

              <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '8px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>AMOUNT RECEIVED</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#15803d', margin: '6px 0' }}>
                  {receiptDoc.currency} {(Number(receiptDoc.amount) || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#166534' }}>
                  Payment Method: <strong>{receiptDoc.method}</strong> {receiptDoc.reference ? `• Ref: ${receiptDoc.reference}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Sunseekers Tours Ltd. • GTA Licensed Tour Operator
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ border: '2px solid #008744', color: '#008744', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '900', transform: 'rotate(-4deg)', display: 'inline-block', marginBottom: '6px' }}>
                    ★ PAID &amp; STAMPED ★
                  </div>
                  <div style={{ width: '150px', borderBottom: '1px solid #0f172a', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700' }}>Authorized Cashier</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
