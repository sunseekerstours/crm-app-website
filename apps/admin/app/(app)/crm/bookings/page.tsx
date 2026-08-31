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
  country?: string;
}

interface DepartureOption {
  id: string;
  tour?: { name?: string };
  startDate?: string;
  price?: number | string;
}

interface BookingItem {
  id: string;
  bookingNumber?: string;
  customerId?: string;
  customer?: CustomerOption;
  departureId?: string;
  departure?: DepartureOption;
  tourName?: string;
  status?: string;
  paxCount?: number;
  totalPrice?: number | string;
  currency?: string;
  bookedAt?: string;
  invoices?: { id: string; invoiceNumber: string; status: string; amount: number }[];
  payments?: { id: string; paymentNumber: string; amount: number }[];
}

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const initialForm = {
  customerId: '',
  departureId: '',
  tourName: '',
  status: 'PENDING',
  paxCount: '1',
  totalPrice: '',
  currency: 'USD',
};

export default function CrmBookingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Paginated<BookingItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BookingItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);

  // Quick Customer Creation modal inside booking
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', email: '', phone: '', country: 'Ghana' });

  // Quick Payment / Receipt Recording modal
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<BookingItem | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'USD',
    method: 'CASH',
    reference: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '50', page: String(page) });
      if (search) q.set('search', search);
      const res = await api.get<Paginated<BookingItem>>(`/bookings?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    }
  }, [page, search]);

  const loadLookups = useCallback(async () => {
    try {
      const custRes = await api.get<Paginated<CustomerOption>>('/customers?limit=200');
      setCustomers(custRes.items ?? []);
    } catch (e) {
      console.error('Failed to load customers for bookings:', e);
    }
    try {
      const depRes = await api.get<Paginated<DepartureOption>>('/departures?limit=200');
      setDepartures(depRes.items ?? []);
    } catch (e) {
      console.error('Failed to load departures for bookings:', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  function loadIntoForm(b: BookingItem) {
    setEditing(b);
    setFormError(null);
    setForm({
      customerId: b.customerId ?? b.customer?.id ?? '',
      departureId: b.departureId ?? b.departure?.id ?? '',
      tourName: b.tourName ?? b.departure?.tour?.name ?? '',
      status: b.status ?? 'PENDING',
      paxCount: b.paxCount != null ? String(b.paxCount) : '1',
      totalPrice: b.totalPrice != null ? String(b.totalPrice) : '',
      currency: b.currency ?? 'USD',
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

    if (!form.customerId) {
      setFormError('Please select or add a Customer for this booking');
      setSubmitting(false);
      return;
    }

    const body: Record<string, unknown> = {
      customerId: form.customerId,
      departureId: form.departureId || undefined,
      tourName: form.tourName || undefined,
      status: form.status,
      paxCount: form.paxCount ? Number(form.paxCount) : 1,
      totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
      currency: form.currency || 'USD',
    };

    try {
      if (editing) {
        await api.patch(`/bookings/${editing.id}`, body);
      } else {
        await api.post('/bookings', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save booking');
    } finally {
      setSubmitting(false);
    }
  }

  // 1-Click Invoice Generator from Booking
  async function generateInvoiceForBooking(b: BookingItem) {
    try {
      const tourTitle = b.tourName || b.departure?.tour?.name || 'Tour Package Booking';
      const amount = Number(b.totalPrice) || 0;
      const invoice = await api.post<any>('/invoices', {
        bookingId: b.id,
        customerId: b.customerId ?? b.customer?.id,
        currency: b.currency || 'USD',
        amount,
        items: [
          {
            description: `${tourTitle} (Ref: ${b.bookingNumber}) - ${b.paxCount ?? 1} Guest(s)`,
            quantity: b.paxCount ?? 1,
            unitPrice: (b.paxCount ?? 1) > 1 ? amount / (b.paxCount ?? 1) : amount,
            total: amount,
          },
        ],
        notes: `Invoice generated for booking ${b.bookingNumber}.`,
        terms: '50% deposit required to confirm reservations. Balance due 14 days prior to departure.',
      });
      alert(`Invoice ${invoice.invoiceNumber} created successfully! You can view and print it in Invoices & Quotes.`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate invoice');
    }
  }

  // 1-Click Quote Generator from Booking
  async function generateQuoteForBooking(b: BookingItem) {
    try {
      const tourTitle = b.tourName || b.departure?.tour?.name || 'Tour Package Booking';
      const amount = Number(b.totalPrice) || 0;
      const quote = await api.post<any>('/quotes', {
        bookingId: b.id,
        customerId: b.customerId ?? b.customer?.id,
        tourName: tourTitle,
        currency: b.currency || 'USD',
        totalPrice: amount,
        items: [
          {
            description: `${tourTitle} (Proposal) - ${b.paxCount ?? 1} Guest(s)`,
            quantity: b.paxCount ?? 1,
            unitPrice: (b.paxCount ?? 1) > 1 ? amount / (b.paxCount ?? 1) : amount,
            total: amount,
          },
        ],
        notes: `Custom proposal quotation for booking ${b.bookingNumber}.`,
      });
      alert(`Quotation ${quote.quoteNumber} created successfully!`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate quote');
    }
  }

  // Record Payment for Booking & Issue Receipt
  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!recordingPaymentFor) return;
    try {
      const res = await api.post<any>('/payments', {
        bookingId: recordingPaymentFor.id,
        customerId: recordingPaymentFor.customerId ?? recordingPaymentFor.customer?.id,
        amount: Number(paymentForm.amount),
        currency: paymentForm.currency,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      alert(`Payment recorded! Official Receipt #${res.receiptNumber || res.paymentNumber} issued.`);
      setRecordingPaymentFor(null);
      setPaymentForm({ amount: '', currency: 'USD', method: 'CASH', reference: '', notes: '' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payment');
    }
  }

  // Quick Customer Creation
  async function submitNewCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await api.post<CustomerOption>('/customers', newCust);
      setCustomers((prev) => [created, ...prev]);
      setForm((f) => ({ ...f, customerId: created.id }));
      setShowAddCustomer(false);
      setNewCust({ firstName: '', lastName: '', email: '', phone: '', country: 'Ghana' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create customer');
    }
  }

  async function remove(b: BookingItem) {
    if (!window.confirm(`Delete booking ${b.bookingNumber ?? ''}? This cannot be undone.`)) return;
    try {
      await api.delete(`/bookings/${b.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function customerLabel(c: CustomerOption) {
    const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    const contact = c.email || c.phone;
    if (name && contact) return `${name} (${contact})`;
    return name || contact || c.id;
  }

  function departureLabel(d: DepartureOption) {
    const tour = d.tour?.name ?? 'Unknown tour';
    const date = d.startDate ? new Date(d.startDate).toLocaleDateString() : '';
    return date ? `${tour} — ${date}` : tour;
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        title="Bookings & Reservations"
        subtitle={editing ? `Edit Booking: ${editing.bookingNumber}` : 'Manage tour bookings, customer reservations, and generate invoices/receipts'}
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
              + Create New Booking
            </Button>
          </div>
        }
      />

      {/* Booking Form Card */}
      <Card title={editing ? `Edit Booking: ${editing.bookingNumber ?? editing.id}` : 'New Customer Booking'}>
        {formError && <ErrorState message={formError} />}

        <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
          <div className="form-grid">
            {/* Customer Dropdown + Quick Add */}
            <div>
              <label className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="field-label">Customer *</span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(true)}
                    style={{ background: 'none', border: 'none', color: '#008744', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    + Add New Customer
                  </button>
                </div>
                <select
                  className="input"
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  required
                >
                  <option value="">— Select customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {customerLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Select
              label="Tour Departure (Optional)"
              name="departureId"
              value={form.departureId}
              onChange={(e) => {
                const dep = departures.find((d) => d.id === e.target.value);
                setForm({
                  ...form,
                  departureId: e.target.value,
                  tourName: dep?.tour?.name || form.tourName,
                  totalPrice: dep?.price ? String(dep.price) : form.totalPrice,
                });
              }}
              options={[{ value: '', label: '— Select departure or type tour name —' }, ...departures.map((d) => ({ value: d.id, label: departureLabel(d) }))]}
            />

            <Input
              label="Tour Package / Trip Name"
              name="tourName"
              value={form.tourName}
              placeholder="e.g. December in Ghana 12 Days"
              onChange={(e) => setForm({ ...form, tourName: e.target.value })}
            />

            <Select
              label="Booking Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />

            <Input
              label="Guests (Pax Count)"
              name="paxCount"
              type="number"
              value={form.paxCount}
              onChange={(e) => setForm({ ...form, paxCount: e.target.value })}
            />

            <Input
              label="Total Price ($/₵)"
              name="totalPrice"
              type="number"
              value={form.totalPrice}
              placeholder="3160"
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving Booking…' : editing ? 'Update Booking' : 'Create Booking'}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Bookings Table */}
      {error && <ErrorState message={error} />}
      {data ? (
        <Card
          title="All Customer Bookings"
          action={
            <input
              type="search"
              placeholder="Search bookings..."
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
          <Table<BookingItem>
            keyOf={(b) => b.id}
            rows={data.items}
            columns={[
              {
                key: 'bookingNumber',
                label: 'Booking #',
                render: (b) => (
                  <div>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{b.bookingNumber ?? '—'}</span>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {b.bookedAt ? new Date(b.bookedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                ),
              },
              {
                key: 'tour',
                label: 'Tour / Package',
                render: (b) => (
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {b.tourName || b.departure?.tour?.name || 'Custom Booking'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{b.paxCount ?? 1} Pax</div>
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Customer',
                render: (b) =>
                  b.customer ? (
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {`${b.customer.firstName ?? ''} ${b.customer.lastName ?? ''}`.trim() || 'Customer'}
                      </div>
                      {b.customer.email && <div style={{ fontSize: '11px', color: '#64748b' }}>{b.customer.email}</div>}
                    </div>
                  ) : (
                    <span style={{ color: '#dc2626' }}>No Customer</span>
                  ),
              },
              {
                key: 'totalPrice',
                label: 'Total Value',
                render: (b) => (
                  <span style={{ fontWeight: '800', color: '#008744', fontSize: '14px' }}>
                    {b.totalPrice != null ? `${b.currency ?? '$'} ${(Number(b.totalPrice) || 0).toLocaleString()}` : '—'}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (b) => {
                  const color = b.status === 'CONFIRMED' ? '#16a34a' : b.status === 'COMPLETED' ? '#0284c7' : b.status === 'CANCELLED' ? '#dc2626' : '#ea580c';
                  return (
                    <Badge>
                      <span style={{ color, fontWeight: 'bold' }}>● {b.status}</span>
                    </Badge>
                  );
                },
              },
              {
                key: 'docs',
                label: 'Billing & Invoices',
                render: (b) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => generateInvoiceForBooking(b)}
                        style={{
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        title="Generate Tax Invoice for this booking"
                      >
                        + Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => generateQuoteForBooking(b)}
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        title="Generate Quotation Proposal"
                      >
                        + Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecordingPaymentFor(b);
                          setPaymentForm({
                            amount: b.totalPrice ? String(b.totalPrice) : '',
                            currency: b.currency || 'USD',
                            method: 'CASH',
                            reference: '',
                            notes: `Payment for booking ${b.bookingNumber}`,
                          });
                        }}
                        style={{
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        title="Record Payment & Issue Stamped Receipt"
                      >
                        + Pay / Receipt
                      </button>
                    </div>
                    <Link
                      href="/crm/invoices"
                      style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'none', fontWeight: '600' }}
                    >
                      View All Documents ↗
                    </Link>
                  </div>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (b) => (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(b)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(b)}>
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

      {/* Quick Add Customer Modal */}
      {showAddCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '800' }}>Add Customer to Booking</h3>
            <form onSubmit={submitNewCustomer} style={{ display: 'grid', gap: '12px' }}>
              <Input
                label="First Name *"
                name="firstName"
                value={newCust.firstName}
                onChange={(e) => setNewCust({ ...newCust, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name *"
                name="lastName"
                value={newCust.lastName}
                onChange={(e) => setNewCust({ ...newCust, lastName: e.target.value })}
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={newCust.email}
                onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
              />
              <Input
                label="Phone"
                name="phone"
                value={newCust.phone}
                onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button type="submit">Save Customer</Button>
                <Button variant="secondary" onClick={() => setShowAddCustomer(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordingPaymentFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800' }}>
              Record Payment &amp; Issue Receipt
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              Booking: <strong>{recordingPaymentFor.bookingNumber}</strong> ({recordingPaymentFor.customer?.firstName} {recordingPaymentFor.customer?.lastName})
            </p>

            <form onSubmit={submitPayment} style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px' }}>
                <Input
                  label="Amount Received *"
                  name="amount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
                <Select
                  label="Currency"
                  name="currency"
                  value={paymentForm.currency}
                  options={CURRENCIES}
                  onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                />
              </div>

              <Select
                label="Payment Method"
                name="method"
                value={paymentForm.method}
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'CARD', label: 'Credit/Debit Card' },
                  { value: 'BANK_TRANSFER', label: 'Bank Wire Transfer' },
                  { value: 'MOBILE_MONEY', label: 'MTN / Vodafone Mobile Money' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'OTHER', label: 'Other' },
                ]}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              />

              <Input
                label="Transaction Reference / Cheque #"
                name="reference"
                value={paymentForm.reference}
                placeholder="e.g. TXN-998234 / Momo ID"
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <Button type="submit">Issue Official Receipt</Button>
                <Button variant="secondary" onClick={() => setRecordingPaymentFor(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
