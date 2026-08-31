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
  Textarea,
} from '@/components/ui';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: { name: string };
}

interface Booking {
  id: string;
  bookingNumber: string;
  tourName?: string;
  customer?: Customer;
}

interface Deal {
  id: string;
  name: string;
  customer?: Customer;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  bookingId?: string;
  booking?: Booking;
  customerId?: string;
  customer?: Customer;
  dealId?: string;
  deal?: Deal;
  amount: number | string;
  amountPaid: number | string;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate?: string;
  dueDate?: string;
  items?: LineItem[];
  tax?: number | string;
  discount?: number | string;
  notes?: string;
  terms?: string;
  payments?: PaymentItem[];
  createdAt: string;
}

interface QuoteItem {
  id: string;
  quoteNumber: string;
  customerId?: string;
  customer?: Customer;
  dealId?: string;
  deal?: Deal;
  bookingId?: string;
  tourName?: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CONVERTED';
  totalPrice: number | string;
  currency: string;
  validUntil?: string;
  items?: LineItem[];
  tax?: number | string;
  discount?: number | string;
  notes?: string;
  terms?: string;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  paymentNumber: string;
  receiptNumber?: string;
  bookingId?: string;
  booking?: Booking;
  invoiceId?: string;
  invoice?: InvoiceItem;
  customerId?: string;
  customer?: Customer;
  dealId?: string;
  deal?: Deal;
  amount: number | string;
  currency: string;
  method: string;
  status: string;
  reference?: string;
  paidAt?: string;
  notes?: string;
}

const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];
const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'];
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export default function CrmInvoicesQuotesPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotes' | 'receipts'>('invoices');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Data lists
  const [invoicesData, setInvoicesData] = useState<Paginated<InvoiceItem> | null>(null);
  const [quotesData, setQuotesData] = useState<Paginated<QuoteItem> | null>(null);
  const [paymentsData, setPaymentsData] = useState<Paginated<PaymentItem> | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    bookingId: '',
    dealId: '',
    currency: 'USD',
    issueDate: new Date().toISOString().substring(0, 10),
    dueDate: '',
    status: 'DRAFT' as InvoiceItem['status'],
    items: [
      { description: 'Tour Package / Travel Service', quantity: 1, unitPrice: 0, total: 0 },
    ] as LineItem[],
    tax: '0',
    discount: '0',
    notes: 'Thank you for choosing Sunseekers Tours. We look forward to creating unforgettable memories with you.',
    terms: '50% deposit required upon booking confirmation. Balance due 14 days prior to departure.',
  });

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteItem | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    customerId: '',
    dealId: '',
    tourName: '',
    currency: 'USD',
    validUntil: '',
    status: 'DRAFT' as QuoteItem['status'],
    items: [
      { description: 'Tour Proposal / Package', quantity: 1, unitPrice: 0, total: 0 },
    ] as LineItem[],
    tax: '0',
    discount: '0',
    notes: 'Special custom travel proposal prepared for you by Sunseekers Tours.',
    terms: 'This quotation is valid for 14 days from date of issue. Prices subject to flight & accommodation availability.',
  });

  // Printable Document Modal State (Invoice, Quote, Receipt)
  const [previewDoc, setPreviewDoc] = useState<{
    type: 'INVOICE' | 'QUOTE' | 'RECEIPT';
    data: any;
  } | null>(null);

  // Quick Customer Creation Modal inside Invoice/Quote builder
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'Ghana',
    address: '',
  });

  // Load Lookups
  useEffect(() => {
    api.get<Paginated<Customer>>('/customers?limit=200').then((r) => setCustomers(r.items ?? [])).catch(() => undefined);
    api.get<Paginated<Booking>>('/bookings?limit=200').then((r) => setBookings(r.items ?? [])).catch(() => undefined);
    api.get<Paginated<Deal>>('/deals?limit=200').then((r) => setDeals(r.items ?? [])).catch(() => undefined);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: '20', page: String(page) });
      if (search) q.set('search', search);

      if (activeTab === 'invoices') {
        const res = await api.get<Paginated<InvoiceItem>>(`/invoices?${q.toString()}`);
        setInvoicesData(res);
      } else if (activeTab === 'quotes') {
        const res = await api.get<Paginated<QuoteItem>>(`/quotes?${q.toString()}`);
        setQuotesData(res);
      } else {
        const res = await api.get<Paginated<PaymentItem>>(`/payments?${q.toString()}`);
        setPaymentsData(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Line item handlers for Invoice
  function updateInvoiceItem(index: number, patch: Partial<LineItem>) {
    setInvoiceForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== index) return it;
        const updated = { ...it, ...patch };
        const q = Number(updated.quantity) || 0;
        const p = Number(updated.unitPrice) || 0;
        updated.total = q * p;
        return updated;
      });
      return { ...f, items };
    });
  }

  function addInvoiceItem() {
    setInvoiceForm((f) => ({
      ...f,
      items: [...f.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
    }));
  }

  function removeInvoiceItem(index: number) {
    setInvoiceForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  }

  // Line item handlers for Quote
  function updateQuoteItem(index: number, patch: Partial<LineItem>) {
    setQuoteForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== index) return it;
        const updated = { ...it, ...patch };
        const q = Number(updated.quantity) || 0;
        const p = Number(updated.unitPrice) || 0;
        updated.total = q * p;
        return updated;
      });
      return { ...f, items };
    });
  }

  function addQuoteItem() {
    setQuoteForm((f) => ({
      ...f,
      items: [...f.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
    }));
  }

  function removeQuoteItem(index: number) {
    setQuoteForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  }

  // Invoice calculations
  const invoiceSubtotal = invoiceForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const invoiceTax = Number(invoiceForm.tax) || 0;
  const invoiceDiscount = Number(invoiceForm.discount) || 0;
  const invoiceGrandTotal = Math.max(0, invoiceSubtotal + invoiceTax - invoiceDiscount);

  // Quote calculations
  const quoteSubtotal = quoteForm.items.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const quoteTax = Number(quoteForm.tax) || 0;
  const quoteDiscount = Number(quoteForm.discount) || 0;
  const quoteGrandTotal = Math.max(0, quoteSubtotal + quoteTax - quoteDiscount);

  // Submit Invoice
  async function submitInvoice(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = {
        customerId: invoiceForm.customerId || undefined,
        bookingId: invoiceForm.bookingId || undefined,
        dealId: invoiceForm.dealId || undefined,
        currency: invoiceForm.currency,
        issueDate: invoiceForm.issueDate || undefined,
        dueDate: invoiceForm.dueDate || undefined,
        status: invoiceForm.status,
        items: invoiceForm.items,
        amount: invoiceGrandTotal,
        tax: Number(invoiceForm.tax) || 0,
        discount: Number(invoiceForm.discount) || 0,
        notes: invoiceForm.notes,
        terms: invoiceForm.terms,
      };

      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}`, body);
      } else {
        await api.post('/invoices', body);
      }
      setShowInvoiceForm(false);
      setEditingInvoice(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save invoice');
    }
  }

  // Submit Quote
  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = {
        customerId: quoteForm.customerId || undefined,
        dealId: quoteForm.dealId || undefined,
        tourName: quoteForm.tourName || undefined,
        currency: quoteForm.currency,
        validUntil: quoteForm.validUntil || undefined,
        status: quoteForm.status,
        items: quoteForm.items,
        totalPrice: quoteGrandTotal,
        tax: Number(quoteForm.tax) || 0,
        discount: Number(quoteForm.discount) || 0,
        notes: quoteForm.notes,
        terms: quoteForm.terms,
      };

      if (editingQuote) {
        await api.patch(`/quotes/${editingQuote.id}`, body);
      } else {
        await api.post('/quotes', body);
      }
      setShowQuoteForm(false);
      setEditingQuote(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save quote');
    }
  }

  // Quick Customer Creation
  async function submitQuickCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await api.post<Customer>('/customers', quickCustomerForm);
      setCustomers((prev) => [created, ...prev]);
      if (showInvoiceForm) {
        setInvoiceForm((f) => ({ ...f, customerId: created.id }));
      }
      if (showQuoteForm) {
        setQuoteForm((f) => ({ ...f, customerId: created.id }));
      }
      setShowQuickCustomerModal(false);
      setQuickCustomerForm({ firstName: '', lastName: '', email: '', phone: '', country: 'Ghana', address: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create customer');
    }
  }

  // Print Document Window
  function printDocument() {
    window.print();
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        title="Financial Documents & Billing"
        subtitle="Generate, track, and print Invoices, Quotations, and Payment Receipts with official Sunseekers branding"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={() => {
                setEditingQuote(null);
                setShowQuoteForm(true);
                setShowInvoiceForm(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              variant="secondary"
            >
              + Create Quotation
            </Button>
            <Button
              onClick={() => {
                setEditingInvoice(null);
                setShowInvoiceForm(true);
                setShowQuoteForm(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              + Create Invoice
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          onClick={() => {
            setActiveTab('invoices');
            setPage(1);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            fontSize: '15px',
            fontWeight: '700',
            color: activeTab === 'invoices' ? '#008744' : '#64748b',
            borderBottom: activeTab === 'invoices' ? '3px solid #008744' : 'none',
            cursor: 'pointer',
          }}
        >
          📄 Invoices
        </button>
        <button
          onClick={() => {
            setActiveTab('quotes');
            setPage(1);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            fontSize: '15px',
            fontWeight: '700',
            color: activeTab === 'quotes' ? '#008744' : '#64748b',
            borderBottom: activeTab === 'quotes' ? '3px solid #008744' : 'none',
            cursor: 'pointer',
          }}
        >
          📋 Quotations / Proposals
        </button>
        <button
          onClick={() => {
            setActiveTab('receipts');
            setPage(1);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            fontSize: '15px',
            fontWeight: '700',
            color: activeTab === 'receipts' ? '#008744' : '#64748b',
            borderBottom: activeTab === 'receipts' ? '3px solid #008744' : 'none',
            cursor: 'pointer',
          }}
        >
          🧾 Payment Receipts
        </button>
      </div>

      {/* =========================================================================
          INVOICE GENERATOR / BUILDER FORM
          ========================================================================= */}
      {showInvoiceForm && (
        <Card
          title={editingInvoice ? `Edit Invoice: ${editingInvoice.invoiceNumber}` : 'New Customer Invoice'}
          action={
            <Button variant="secondary" onClick={() => setShowInvoiceForm(false)}>
              Cancel
            </Button>
          }
        >
          <form onSubmit={submitInvoice} style={{ display: 'grid', gap: '20px' }}>
            {/* Customer & Relation Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="field-label">Customer *</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCustomerModal(true)}
                      style={{ fontSize: '11px', color: '#008744', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      + Add New Customer
                    </button>
                  </div>
                  <select
                    className="input"
                    value={invoiceForm.customerId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="field">
                  <span className="field-label">Linked Booking (Optional)</span>
                  <select
                    className="input"
                    value={invoiceForm.bookingId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, bookingId: e.target.value })}
                  >
                    <option value="">None / Standalone</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bookingNumber} {b.tourName ? `- ${b.tourName}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="field">
                  <span className="field-label">Linked Deal / Inquiry (Optional)</span>
                  <select
                    className="input"
                    value={invoiceForm.dealId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dealId: e.target.value })}
                  >
                    <option value="">None / Standalone</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Select
                label="Currency"
                name="currency"
                value={invoiceForm.currency}
                options={CURRENCIES}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}
              />

              <Input
                label="Issue Date"
                name="issueDate"
                type="date"
                value={invoiceForm.issueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
              />

              <Input
                label="Payment Due Date"
                name="dueDate"
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
              />

              <Select
                label="Status"
                name="status"
                value={invoiceForm.status}
                options={INVOICE_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as any })}
              />
            </div>

            {/* Line Items Table Builder */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Invoice Line Items</span>
                <Button variant="secondary" onClick={addInvoiceItem}>
                  + Add Line Item
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {invoiceForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 100px 140px 140px 40px',
                      gap: '10px',
                      alignItems: 'center',
                      background: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <input
                      type="text"
                      className="input"
                      placeholder="Item description (e.g. 12-Day Ghana Tour - Double Occupancy)"
                      value={item.description}
                      onChange={(e) => updateInvoiceItem(idx, { description: e.target.value })}
                      required
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateInvoiceItem(idx, { quantity: Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => updateInvoiceItem(idx, { unitPrice: Number(e.target.value) })}
                    />
                    <div style={{ fontWeight: '700', color: '#0f172a', textAlign: 'right', paddingRight: '8px' }}>
                      {invoiceForm.currency} {(Number(item.total) || 0).toLocaleString()}
                    </div>
                    {invoiceForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInvoiceItem(idx)}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', height: '32px', cursor: 'pointer', fontWeight: 'bold' }}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals Calculation Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>{invoiceForm.currency} {invoiceSubtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>Tax / VAT ($):</span>
                    <input
                      type="number"
                      style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                      value={invoiceForm.tax}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, tax: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>Discount ($):</span>
                    <input
                      type="number"
                      style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                      value={invoiceForm.discount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', color: '#008744', borderTop: '2px solid #e2e8f0', paddingTop: '8px' }}>
                    <span>Grand Total:</span>
                    <span>{invoiceForm.currency} {invoiceGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Textarea
                label="Invoice Notes (Visible to Customer)"
                name="notes"
                rows={2}
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
              />
              <Textarea
                label="Payment Terms & Instructions"
                name="terms"
                rows={2}
                value={invoiceForm.terms}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, terms: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit">
                {editingInvoice ? 'Update Invoice' : 'Generate & Issue Invoice'}
              </Button>
              <Button variant="secondary" onClick={() => setShowInvoiceForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* =========================================================================
          QUOTATION GENERATOR / BUILDER FORM
          ========================================================================= */}
      {showQuoteForm && (
        <Card
          title={editingQuote ? `Edit Quotation: ${editingQuote.quoteNumber}` : 'New Price Proposal / Quotation'}
          action={
            <Button variant="secondary" onClick={() => setShowQuoteForm(false)}>
              Cancel
            </Button>
          }
        >
          <form onSubmit={submitQuote} style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="field-label">Customer *</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCustomerModal(true)}
                      style={{ fontSize: '11px', color: '#008744', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      + Add New Customer
                    </button>
                  </div>
                  <select
                    className="input"
                    value={quoteForm.customerId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customerId: e.target.value })}
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Input
                label="Tour / Package Name"
                name="tourName"
                value={quoteForm.tourName}
                placeholder="e.g. 10 Days Best of Ghana Luxury"
                onChange={(e) => setQuoteForm({ ...quoteForm, tourName: e.target.value })}
              />

              <Select
                label="Currency"
                name="currency"
                value={quoteForm.currency}
                options={CURRENCIES}
                onChange={(e) => setQuoteForm({ ...quoteForm, currency: e.target.value })}
              />

              <Input
                label="Proposal Valid Until"
                name="validUntil"
                type="date"
                value={quoteForm.validUntil}
                onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
              />

              <Select
                label="Status"
                name="status"
                value={quoteForm.status}
                options={QUOTE_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(e) => setQuoteForm({ ...quoteForm, status: e.target.value as any })}
              />
            </div>

            {/* Line Items for Quote */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Quote Line Items</span>
                <Button variant="secondary" onClick={addQuoteItem}>
                  + Add Line Item
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {quoteForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 100px 140px 140px 40px',
                      gap: '10px',
                      alignItems: 'center',
                      background: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <input
                      type="text"
                      className="input"
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateQuoteItem(idx, { description: e.target.value })}
                      required
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuoteItem(idx, { quantity: Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => updateQuoteItem(idx, { unitPrice: Number(e.target.value) })}
                    />
                    <div style={{ fontWeight: '700', color: '#0f172a', textAlign: 'right', paddingRight: '8px' }}>
                      {quoteForm.currency} {(Number(item.total) || 0).toLocaleString()}
                    </div>
                    {quoteForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuoteItem(idx)}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', height: '32px', cursor: 'pointer', fontWeight: 'bold' }}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>{quoteForm.currency} {quoteSubtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>Tax ($):</span>
                    <input
                      type="number"
                      style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                      value={quoteForm.tax}
                      onChange={(e) => setQuoteForm({ ...quoteForm, tax: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>Discount ($):</span>
                    <input
                      type="number"
                      style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                      value={quoteForm.discount}
                      onChange={(e) => setQuoteForm({ ...quoteForm, discount: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', color: '#008744', borderTop: '2px solid #e2e8f0', paddingTop: '8px' }}>
                    <span>Total Proposal:</span>
                    <span>{quoteForm.currency} {quoteGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Textarea
                label="Proposal Notes"
                name="notes"
                rows={2}
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
              />
              <Textarea
                label="Terms & Validity"
                name="terms"
                rows={2}
                value={quoteForm.terms}
                onChange={(e) => setQuoteForm({ ...quoteForm, terms: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit">
                {editingQuote ? 'Update Quotation' : 'Create Quotation'}
              </Button>
              <Button variant="secondary" onClick={() => setShowQuoteForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* =========================================================================
          TAB 1: INVOICES TABLE
          ========================================================================= */}
      {activeTab === 'invoices' && (
        <Card
          title="All Invoices"
          action={
            <input
              type="search"
              placeholder="Search by invoice # or customer..."
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
          {error && <ErrorState message={error} />}
          {loading && !invoicesData && <Spinner />}

          <Table<InvoiceItem>
            rows={invoicesData?.items ?? []}
            columns={[
              {
                key: 'invoiceNumber',
                label: 'Invoice #',
                render: (r) => (
                  <div>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{r.invoiceNumber}</span>
                    {r.booking && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Booking: {r.booking.bookingNumber}</div>
                    )}
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Customer',
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : '—'}
                    </div>
                    {r.customer?.email && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.customer.email}</div>}
                  </div>
                ),
              },
              {
                key: 'amount',
                label: 'Amount / Paid',
                render: (r) => {
                  const amt = Number(r.amount) || 0;
                  const paid = Number(r.amountPaid) || 0;
                  const balance = amt - paid;
                  return (
                    <div>
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>
                        {r.currency} {amt.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '11px', color: paid >= amt ? '#16a34a' : paid > 0 ? '#ea580c' : '#64748b' }}>
                        Paid: {r.currency} {paid.toLocaleString()} {balance > 0 ? `(Bal: ${balance.toLocaleString()})` : ''}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'dates',
                label: 'Dates',
                render: (r) => (
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    <div>Issued: {r.issueDate ? new Date(r.issueDate).toLocaleDateString() : '—'}</div>
                    {r.dueDate && <div style={{ color: '#dc2626' }}>Due: {new Date(r.dueDate).toLocaleDateString()}</div>}
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => {
                  const colorMap: Record<string, string> = {
                    PAID: '#16a34a',
                    PARTIALLY_PAID: '#ea580c',
                    ISSUED: '#0284c7',
                    DRAFT: '#64748b',
                    OVERDUE: '#dc2626',
                    CANCELLED: '#94a3b8',
                  };
                  return (
                    <Badge>
                      <span style={{ color: colorMap[r.status] || '#64748b', fontWeight: 'bold' }}>
                        ● {r.status}
                      </span>
                    </Badge>
                  );
                },
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="secondary"
                      onClick={() => setPreviewDoc({ type: 'INVOICE', data: r })}
                    >
                      🖨️ Print / View
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingInvoice(r);
                        setInvoiceForm({
                          customerId: r.customerId || '',
                          bookingId: r.bookingId || '',
                          dealId: r.dealId || '',
                          currency: r.currency || 'USD',
                          issueDate: r.issueDate ? r.issueDate.substring(0, 10) : '',
                          dueDate: r.dueDate ? r.dueDate.substring(0, 10) : '',
                          status: r.status,
                          items: Array.isArray(r.items) && r.items.length > 0 ? r.items : [{ description: 'Travel Service', quantity: 1, unitPrice: Number(r.amount) || 0, total: Number(r.amount) || 0 }],
                          tax: String(r.tax ?? '0'),
                          discount: String(r.discount ?? '0'),
                          notes: r.notes || '',
                          terms: r.terms || '',
                        });
                        setShowInvoiceForm(true);
                        setShowQuoteForm(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ),
              },
            ]}
          />

          {invoicesData && (
            <div style={{ marginTop: '16px' }}>
              <Pagination page={page} totalPages={invoicesData.totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          TAB 2: QUOTATIONS TABLE
          ========================================================================= */}
      {activeTab === 'quotes' && (
        <Card
          title="All Quotations & Price Proposals"
          action={
            <input
              type="search"
              placeholder="Search by quote # or customer..."
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
          {error && <ErrorState message={error} />}
          {loading && !quotesData && <Spinner />}

          <Table<QuoteItem>
            rows={quotesData?.items ?? []}
            columns={[
              {
                key: 'quoteNumber',
                label: 'Quote #',
                render: (r) => (
                  <div>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{r.quoteNumber}</span>
                    {r.tourName && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.tourName}</div>}
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Customer',
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : '—'}
                    </div>
                    {r.customer?.email && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.customer.email}</div>}
                  </div>
                ),
              },
              {
                key: 'totalPrice',
                label: 'Total Value',
                render: (r) => (
                  <span style={{ fontWeight: '800', color: '#008744', fontSize: '15px' }}>
                    {r.currency} {(Number(r.totalPrice) || 0).toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'validity',
                label: 'Validity',
                render: (r) => (
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Valid until: {r.validUntil ? new Date(r.validUntil).toLocaleDateString() : 'No expiry'}
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => {
                  const colorMap: Record<string, string> = {
                    ACCEPTED: '#16a34a',
                    CONVERTED: '#0284c7',
                    SENT: '#ea580c',
                    DRAFT: '#64748b',
                    DECLINED: '#dc2626',
                    EXPIRED: '#94a3b8',
                  };
                  return (
                    <Badge>
                      <span style={{ color: colorMap[r.status] || '#64748b', fontWeight: 'bold' }}>
                        ● {r.status}
                      </span>
                    </Badge>
                  );
                },
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="secondary"
                      onClick={() => setPreviewDoc({ type: 'QUOTE', data: r })}
                    >
                      🖨️ Print / View
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingQuote(r);
                        setQuoteForm({
                          customerId: r.customerId || '',
                          dealId: r.dealId || '',
                          tourName: r.tourName || '',
                          currency: r.currency || 'USD',
                          validUntil: r.validUntil ? r.validUntil.substring(0, 10) : '',
                          status: r.status,
                          items: Array.isArray(r.items) && r.items.length > 0 ? r.items : [{ description: r.tourName || 'Tour Package', quantity: 1, unitPrice: Number(r.totalPrice) || 0, total: Number(r.totalPrice) || 0 }],
                          tax: String(r.tax ?? '0'),
                          discount: String(r.discount ?? '0'),
                          notes: r.notes || '',
                          terms: r.terms || '',
                        });
                        setShowQuoteForm(true);
                        setShowInvoiceForm(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ),
              },
            ]}
          />

          {quotesData && (
            <div style={{ marginTop: '16px' }}>
              <Pagination page={page} totalPages={quotesData.totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          TAB 3: PAYMENT RECEIPTS TABLE
          ========================================================================= */}
      {activeTab === 'receipts' && (
        <Card
          title="Payment Receipts"
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
          {error && <ErrorState message={error} />}
          {loading && !paymentsData && <Spinner />}

          <Table<PaymentItem>
            rows={paymentsData?.items ?? []}
            columns={[
              {
                key: 'receiptNumber',
                label: 'Receipt #',
                render: (r) => (
                  <div>
                    <span style={{ fontWeight: '800', color: '#166534', fontFamily: 'monospace' }}>
                      {r.receiptNumber || r.paymentNumber}
                    </span>
                    {r.invoice && <div style={{ fontSize: '11px', color: '#64748b' }}>Inv: {r.invoice.invoiceNumber}</div>}
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Customer / Payer',
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : r.invoice?.customer ? `${r.invoice.customer.firstName} ${r.invoice.customer.lastName}` : '—'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'amount',
                label: 'Amount Paid',
                render: (r) => (
                  <span style={{ fontWeight: '900', color: '#16a34a', fontSize: '15px' }}>
                    {r.currency} {(Number(r.amount) || 0).toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'method',
                label: 'Payment Method',
                render: (r) => (
                  <div>
                    <Badge>{r.method}</Badge>
                    {r.reference && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Ref: {r.reference}</div>}
                  </div>
                ),
              },
              {
                key: 'date',
                label: 'Payment Date',
                render: (r) => (
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    {r.paidAt ? new Date(r.paidAt).toLocaleString() : '—'}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <Button
                    variant="secondary"
                    onClick={() => setPreviewDoc({ type: 'RECEIPT', data: r })}
                  >
                    🧾 Print Receipt
                  </Button>
                ),
              },
            ]}
          />

          {paymentsData && (
            <div style={{ marginTop: '16px' }}>
              <Pagination page={page} totalPages={paymentsData.totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          PRINTABLE DOCUMENT PREVIEW MODAL (INVOICE / QUOTE / RECEIPT)
          ========================================================================= */}
      {previewDoc && (
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
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header Toolbar */}
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
                {previewDoc.type === 'INVOICE' && `Invoice: ${previewDoc.data.invoiceNumber}`}
                {previewDoc.type === 'QUOTE' && `Quotation: ${previewDoc.data.quoteNumber}`}
                {previewDoc.type === 'RECEIPT' && `Receipt: ${previewDoc.data.receiptNumber || previewDoc.data.paymentNumber}`}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={printDocument}>
                  🖨️ Print / Save PDF
                </Button>
                <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
                  ✕ Close
                </Button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div
              id="printable-document-content"
              style={{
                padding: '40px',
                overflowY: 'auto',
                background: '#ffffff',
                color: '#0f172a',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Brand Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #008744', paddingBottom: '24px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: '#008744', letterSpacing: '-0.5px' }}>
                    SUNSEEKERS TOURS
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>
                    Discover Ghana &amp; Beyond • Leading Inbound &amp; Outbound Tour Operator
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                    Accra, Ghana • Tel: +233 (0) 302 225 311 / +233 24 431 2345<br />
                    Email: info@sunseekerstours.com • Web: www.sunseekerstours.com
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: '900',
                      color: previewDoc.type === 'RECEIPT' ? '#166534' : '#0f172a',
                      textTransform: 'uppercase',
                    }}
                  >
                    {previewDoc.type === 'INVOICE' && 'TAX INVOICE'}
                    {previewDoc.type === 'QUOTE' && 'PRICE PROPOSAL'}
                    {previewDoc.type === 'RECEIPT' && 'OFFICIAL RECEIPT'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'monospace', marginTop: '4px' }}>
                    {previewDoc.type === 'INVOICE' && previewDoc.data.invoiceNumber}
                    {previewDoc.type === 'QUOTE' && previewDoc.data.quoteNumber}
                    {previewDoc.type === 'RECEIPT' && (previewDoc.data.receiptNumber || previewDoc.data.paymentNumber)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Date: {new Date(previewDoc.data.issueDate || previewDoc.data.paidAt || previewDoc.data.createdAt).toLocaleDateString()}
                  </div>
                  {previewDoc.type === 'INVOICE' && previewDoc.data.dueDate && (
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '700' }}>
                      Due: {new Date(previewDoc.data.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Bill To / Customer Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {previewDoc.type === 'RECEIPT' ? 'RECEIVED FROM' : 'BILLED TO'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    {previewDoc.data.customer?.firstName} {previewDoc.data.customer?.lastName || previewDoc.data.invoice?.customer?.firstName}
                  </div>
                  {previewDoc.data.customer?.email && (
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      ✉️ {previewDoc.data.customer.email}
                    </div>
                  )}
                  {previewDoc.data.customer?.phone && (
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      📞 {previewDoc.data.customer.phone}
                    </div>
                  )}
                  {previewDoc.data.customer?.address && (
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      📍 {previewDoc.data.customer.address}
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    REFERENCE DETAILS
                  </div>
                  {previewDoc.data.booking && (
                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>Booking Ref:</strong> {previewDoc.data.booking.bookingNumber}
                    </div>
                  )}
                  {previewDoc.data.tourName && (
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                      <strong>Tour:</strong> {previewDoc.data.tourName}
                    </div>
                  )}
                  {previewDoc.type === 'RECEIPT' && previewDoc.data.method && (
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                      <strong>Payment Method:</strong> {previewDoc.data.method}
                    </div>
                  )}
                  {previewDoc.type === 'RECEIPT' && previewDoc.data.reference && (
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                      <strong>Transaction Ref:</strong> {previewDoc.data.reference}
                    </div>
                  )}
                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                    <strong>Status:</strong> <span style={{ fontWeight: 'bold', color: '#008744' }}>{previewDoc.data.status}</span>
                  </div>
                </div>
              </div>

              {/* Items Table (For Invoices and Quotes) */}
              {(previewDoc.type === 'INVOICE' || previewDoc.type === 'QUOTE') && (
                <div style={{ marginBottom: '24px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#008744', color: '#fff' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', borderRadius: '6px 0 0 0' }}>DESCRIPTION</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', width: '80px' }}>QTY</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', width: '120px' }}>RATE</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', width: '130px', borderRadius: '0 6px 0 0' }}>AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(previewDoc.data.items) && previewDoc.data.items.length > 0
                        ? previewDoc.data.items
                        : [{ description: previewDoc.data.tourName || 'Tour Service Package', quantity: 1, unitPrice: previewDoc.data.amount || previewDoc.data.totalPrice, total: previewDoc.data.amount || previewDoc.data.totalPrice }]
                      ).map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '600' }}>{item.description}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '14px' }}>
                            {previewDoc.data.currency} {(Number(item.unitPrice) || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>
                            {previewDoc.data.currency} {(Number(item.total) || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Breakdown */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Number(previewDoc.data.tax) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                          <span>Tax / VAT:</span>
                          <span>{previewDoc.data.currency} {Number(previewDoc.data.tax).toLocaleString()}</span>
                        </div>
                      )}
                      {Number(previewDoc.data.discount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ea580c' }}>
                          <span>Discount:</span>
                          <span>- {previewDoc.data.currency} {Number(previewDoc.data.discount).toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900', color: '#008744', borderTop: '2px solid #008744', paddingTop: '8px' }}>
                        <span>TOTAL:</span>
                        <span>{previewDoc.data.currency} {(Number(previewDoc.data.amount || previewDoc.data.totalPrice) || 0).toLocaleString()}</span>
                      </div>
                      {previewDoc.type === 'INVOICE' && Number(previewDoc.data.amountPaid) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>
                          <span>Amount Paid:</span>
                          <span>{previewDoc.data.currency} {Number(previewDoc.data.amountPaid).toLocaleString()}</span>
                        </div>
                      )}
                      {previewDoc.type === 'INVOICE' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#dc2626', fontWeight: '800' }}>
                          <span>Balance Due:</span>
                          <span>{previewDoc.data.currency} {Math.max(0, (Number(previewDoc.data.amount) || 0) - (Number(previewDoc.data.amountPaid) || 0)).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Body */}
              {previewDoc.type === 'RECEIPT' && (
                <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '10px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                    TOTAL AMOUNT RECEIVED
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#15803d', margin: '8px 0' }}>
                    {previewDoc.data.currency} {(Number(previewDoc.data.amount) || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '13px', color: '#166534' }}>
                    Payment confirmed via <strong>{previewDoc.data.method}</strong> on {new Date(previewDoc.data.paidAt).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Bank & Payment Details */}
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '6px' }}>
                  🏦 Bank &amp; Payment Details
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                  <strong>Bank:</strong> Ecobank Ghana PLC • <strong>Account Name:</strong> Sunseekers Tours Limited<br />
                  <strong>USD Account:</strong> 1441001234567 • <strong>GHS Account:</strong> 0441001234567 • <strong>SWIFT:</strong> ECOGGHAC<br />
                  <strong>MTN Mobile Money:</strong> +233 24 431 2345 (Sunseekers Tours)
                </div>
              </div>

              {/* Official Stamp & Sign */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Authorized Document • Sunseekers Tours Ltd.<br />
                  Licensed by Ghana Tourism Authority (GTA)
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ border: '2px solid #008744', color: '#008744', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', transform: 'rotate(-4deg)', display: 'inline-block', marginBottom: '8px' }}>
                    ★ SUNSEEKERS VERIFIED ★
                  </div>
                  <div style={{ width: '180px', borderBottom: '1px solid #0f172a', margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          QUICK CUSTOMER CREATION MODAL
          ========================================================================= */}
      {showQuickCustomerModal && (
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
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '800' }}>Add New Customer</h3>
            <form onSubmit={submitQuickCustomer} style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input
                  label="First Name *"
                  name="firstName"
                  value={quickCustomerForm.firstName}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name *"
                  name="lastName"
                  value={quickCustomerForm.lastName}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, lastName: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Email"
                name="email"
                type="email"
                value={quickCustomerForm.email}
                onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })}
              />
              <Input
                label="Phone"
                name="phone"
                value={quickCustomerForm.phone}
                onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
              />
              <Input
                label="Country"
                name="country"
                value={quickCustomerForm.country}
                onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, country: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button type="submit">Save Customer</Button>
                <Button variant="secondary" onClick={() => setShowQuickCustomerModal(false)}>
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
