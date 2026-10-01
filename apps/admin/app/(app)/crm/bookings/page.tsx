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
import ProductSearchPicker from '@/components/ProductSearchPicker';

interface CustomerOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
}

interface BookingItem {
  id: string;
  bookingNumber?: string;
  customerId?: string;
  customer?: CustomerOption;
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
  tourName: '',
  status: 'PENDING',
  paxCount: '1',
  unitPrice: 0,
  totalPrice: '',
  currency: 'USD',
};

export default function CrmBookingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [data, setData] = useState<Paginated<BookingItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BookingItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);

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

  // Confirm Booking & Review Financials Modal State
  const [confirmModalBooking, setConfirmModalBooking] = useState<BookingItem | null>(null);
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

  function openConfirmModal(b: BookingItem) {
    setConfirmModalBooking(b);
    const pax = b.paxCount ?? 1;
    const uPrice = b.totalPrice && pax ? Number(b.totalPrice) / pax : 0;
    setConfirmForm({
      tourName: b.tourName || '',
      paxCount: pax,
      unitPrice: uPrice,
      totalPrice: b.totalPrice != null ? String(b.totalPrice) : '',
      currency: b.currency || 'USD',
      status: 'CONFIRMED',
      notes: '',
    });
  }

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
      alert(`Booking ${confirmModalBooking.bookingNumber} confirmed and financials saved!`);
      setConfirmModalBooking(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update booking financials');
    } finally {
      setConfirmSubmitting(false);
    }
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '50', page: String(page) });
      if (search.trim()) q.set('search', search.trim());
      if (statusFilter) q.set('status', statusFilter);
      const res = await api.get<Paginated<BookingItem>>(`/bookings?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    }
  }, [page, search, statusFilter]);

  const loadLookups = useCallback(async () => {
    try {
      const custRes = await api.get<Paginated<CustomerOption>>('/customers?limit=200');
      setCustomers(custRes.items ?? []);
    } catch (e) {
      console.error('Failed to load customers for bookings:', e);
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
    const pax = b.paxCount ?? 1;
    const uPrice = b.totalPrice && pax ? Number(b.totalPrice) / pax : 0;
    setForm({
      customerId: b.customerId ?? b.customer?.id ?? '',
      tourName: b.tourName ?? '',
      status: b.status ?? 'PENDING',
      paxCount: b.paxCount != null ? String(b.paxCount) : '1',
      unitPrice: uPrice,
      totalPrice: b.totalPrice != null ? String(b.totalPrice) : '',
      currency: b.currency ?? 'USD',
    });
    if (b.customer) {
      setSelectedCustomerObj({
        id: b.customer.id,
        firstName: b.customer.firstName,
        lastName: b.customer.lastName,
        email: b.customer.email,
        phone: b.customer.phone,
        country: b.customer.country,
      });
    } else {
      setSelectedCustomerObj(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(initialForm);
    setSelectedCustomerObj(null);
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
      const tourTitle = b.tourName || 'Tour Package Booking';
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
      const tourTitle = b.tourName || 'Tour Package Booking';
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
      setSelectedCustomerObj(created);
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

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        title="Bookings & Reservations"
        subtitle={editing ? `Edit Booking: ${editing.bookingNumber}` : 'Manage tour bookings, customer reservations, and generate invoices/receipts'}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              disabled={isExportingAll}
              onClick={async () => {
                setIsExportingAll(true);
                const extra: Record<string, string> = {};
                if (search.trim()) extra.search = search.trim();
                if (statusFilter) extra.status = statusFilter;
                await exportAllFromApi(
                  '/bookings',
                  'sunseekers_all_tour_bookings',
                  [
                    { key: 'bookingNumber', label: 'Booking No' },
                    { key: 'customer', label: 'Customer', format: (b) => b.customer ? `${b.customer.firstName ?? ''} ${b.customer.lastName ?? ''}`.trim() : '' },
                    { key: 'tourName', label: 'Tour / Trip Name' },
                    { key: 'paxCount', label: 'Pax Count' },
                    { key: 'totalPrice', label: 'Total Price' },
                    { key: 'currency', label: 'Currency' },
                    { key: 'status', label: 'Status' },
                    { key: 'bookedAt', label: 'Booking Date' },
                  ],
                  extra
                );
                setIsExportingAll(false);
              }}
            >
              {isExportingAll ? '⏳ Exporting All Bookings…' : '📥 Export All CSV'}
            </Button>
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
            {/* Customer Search & Quick Add */}
            <div style={{ gridColumn: '1 / -1' }}>
              <CustomerSearchPicker
                value={form.customerId}
                selectedCustomer={selectedCustomerObj}
                onSelect={(c) => {
                  setForm((f) => ({ ...f, customerId: c?.id ?? '' }));
                  setSelectedCustomerObj(c);
                }}
                onAddNew={() => setShowAddCustomer(true)}
                onViewDetails={(id) => setViewCustomerId(id)}
                required
              />
            </div>

            {/* Product / Service Selection */}
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📦</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                    Select Available Product / Service (Tours, Fleet Rental, Hotel, Flight Bookings)
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Auto-calculates total price (unit price × pax) into editable financials
                </span>
              </div>
              <ProductSearchPicker
                selectedProductName={form.tourName}
                placeholder="🔍 Select from product catalog or click a category tab above..."
                onSelect={(prod) => {
                  if (prod) {
                    const uPrice = prod.price != null ? Number(prod.price) : 0;
                    const pax = Number(form.paxCount) || 1;
                    const calc = uPrice > 0 ? (uPrice * pax).toFixed(0) : form.totalPrice;
                    setForm((f) => ({
                      ...f,
                      tourName: prod.name,
                      unitPrice: uPrice,
                      totalPrice: calc,
                      currency: prod.currency || f.currency,
                    }));
                  }
                }}
              />
            </div>

            <Input
              label="Tour Package / Product / Trip Name"
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
              min="1"
              value={form.paxCount}
              onChange={(e) => {
                const pax = Number(e.target.value) || 1;
                setForm((f) => ({
                  ...f,
                  paxCount: e.target.value,
                  totalPrice: f.unitPrice > 0 ? (f.unitPrice * pax).toFixed(0) : f.totalPrice,
                }));
              }}
            />

            {/* FINANCIALS & EXPECTED AMOUNT SECTION */}
            <div
              style={{
                gridColumn: '1 / -1',
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
                    Financials &amp; Expected Pricing
                  </span>
                </div>
                {form.unitPrice > 0 && (
                  <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                    Catalog: {form.currency} {form.unitPrice.toLocaleString()} × {form.paxCount} pax = {form.currency} {(form.unitPrice * (Number(form.paxCount) || 1)).toLocaleString()}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <Input
                  label="Total Price ($/₵) *"
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

              <div style={{ marginTop: 8, fontSize: 11, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>ℹ️</span>
                <span>Financials are automatically determined from the selected product. You can freely edit or adjust the total price where necessary (e.g. negotiated discounts, custom group quotes).</span>
              </div>
            </div>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 10, fontSize: 13, color: '#64748b' }}>🔍</span>
                <input
                  type="search"
                  placeholder="Search customer, booking #, tour..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      void load();
                    }
                  }}
                  style={{
                    padding: '8px 12px 8px 30px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    minWidth: '240px',
                  }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="">All Statuses</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={() => {
                  setPage(1);
                  void load();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>🔍</span> Search
              </Button>
              {(search || statusFilter) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('');
                    setPage(1);
                  }}
                >
                  ✕ Clear
                </Button>
              )}
            </div>
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
                label: 'Tour / Product / Package',
                render: (b) => {
                  const name = b.tourName || 'Custom Booking';
                  let icon = '🎯';
                  const lower = name.toLowerCase();
                  if (lower.includes('tour') || lower.includes('ghana') || lower.includes('cape coast') || lower.includes('castle')) icon = '🌍';
                  else if (lower.includes('fleet') || lower.includes('bus') || lower.includes('car') || lower.includes('van') || lower.includes('rental')) icon = '🚐';
                  else if (lower.includes('hotel') || lower.includes('resort') || lower.includes('suite') || lower.includes('lodge')) icon = '🏨';
                  else if (lower.includes('flight') || lower.includes('airline') || lower.includes('air') || lower.includes('ticket')) icon = '✈️';
                  return (
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{icon}</span>
                        <span>{name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{b.paxCount ?? 1} Pax</div>
                    </div>
                  );
                },
              },
              {
                key: 'customer',
                label: 'Customer',
                render: (b) =>
                  b.customer ? (
                    <div style={{ minWidth: '170px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>
                          {`${b.customer.firstName ?? ''} ${b.customer.lastName ?? ''}`.trim() || 'Customer'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewCustomerId(b.customer!.id)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            color: '#1d4ed8',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                          title="View customer profile and history"
                        >
                          👁️ View
                        </button>
                      </div>
                      {b.customer.phone && <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {b.customer.phone}</div>}
                      {b.customer.email && <div style={{ fontSize: '11px', color: '#64748b' }}>✉️ {b.customer.email}</div>}
                    </div>
                  ) : (
                    <span style={{ color: '#dc2626', fontSize: '12px' }}>No Customer</span>
                  ),
              },
              {
                key: 'totalPrice',
                label: 'Total Value',
                render: (b) => (
                  <span style={{ fontWeight: '800', color: '#008744', fontSize: '14px', whiteSpace: 'nowrap' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => generateInvoiceForBooking(b)}
                        style={{
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
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
                          padding: '3px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
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
                          padding: '3px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        title="Record Payment & Issue Stamped Receipt"
                      >
                        + Payment
                      </button>
                    </div>
                    <Link
                      href="/crm/invoices"
                      style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'none', fontWeight: '600' }}
                    >
                      View All Invoices ↗
                    </Link>
                  </div>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (b) => (
                  <div style={{ display: 'flex', gap: 6, minWidth: '140px', alignItems: 'center' }}>
                    {b.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => openConfirmModal(b)}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                        title="Confirm Booking & Save Financials"
                      >
                        <span>✓</span> Confirm
                      </button>
                    )}
                    <Button variant="secondary" onClick={() => loadIntoForm(b)} style={{ padding: '4px 8px', fontSize: '12px' }}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(b)} style={{ padding: '4px 8px', fontSize: '12px' }}>
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

      {/* Confirm Booking & Review Financials Modal */}
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
              <ProductSearchPicker
                label="Product / Package (Select from Catalog or Change)"
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

      {/* Customer Full Details Modal */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  );
}
