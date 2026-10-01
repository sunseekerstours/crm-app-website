'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api, type Paginated } from '@/lib/api';
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import ProductSearchPicker from '@/components/ProductSearchPicker';

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
}

export default function BookingsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Booking>(`/bookings?page=${page}&limit=10`, [page]);
  const [form, setForm] = useState({ customerId: '', tourName: '', paxCount: '1', totalPrice: '' });
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<CustomerSummary | null>(null);
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        paxCount: Number(form.paxCount),
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
      });
      setForm({ customerId: '', tourName: '', paxCount: '1', totalPrice: '' });
      setSelectedCustomerObj(null);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Confirmed and pending reservations" />
      <Card title="New booking">
        <form onSubmit={create}>
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

          <div style={{ marginBottom: 16 }}>
            <ProductSearchPicker
              label="Select Product / Service (Tours, Fleet Rental, Hotel, Flight Bookings)"
              placeholder="🔍 Select from product catalog (or type custom tour name below)..."
              onSelect={(prod) => {
                if (prod) {
                  setForm((f) => ({
                    ...f,
                    tourName: prod.name,
                    totalPrice: prod.price != null ? String(prod.price) : f.totalPrice,
                  }));
                }
              }}
            />
          </div>

          <div className="form-grid">
            <Input label="Tour or Product Name" name="tourName" placeholder="e.g. Cape Coast & Elmina Castle Tour" value={form.tourName} onChange={(e) => setForm({ ...form, tourName: e.target.value })} />
            <Input label="Pax count" name="paxCount" type="number" min="1" value={form.paxCount} onChange={(e) => setForm({ ...form, paxCount: e.target.value })} />
            <Input label="Total price" name="totalPrice" type="number" placeholder="e.g. 1200" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create booking'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Bookings">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', borderRadius: 8 }}>
              <div style={{ minWidth: 900 }}>
                <Table
                  columns={[
                    { key: 'bookingNumber', label: 'Booking Number', render: (r: Booking) => <span style={{ fontWeight: 700 }}>{r.bookingNumber}</span> },
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
                                width: 36,
                                height: 36,
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, lineHeight: 1.3 }}>{custName}</span>
                              {custId && (
                                <button
                                  type="button"
                                  onClick={() => setViewCustomerId(custId)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#1d4ed8',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    borderRadius: 4,
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    width: 'fit-content',
                                  }}
                                  title="View full customer profile"
                                >
                                  👁️ View Details
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
                        const name = r.tourName;
                        if (!name) return '—';
                        let icon = '🎯';
                        const lower = name.toLowerCase();
                        if (lower.includes('tour') || lower.includes('ghana') || lower.includes('cape coast') || lower.includes('castle')) icon = '🌍';
                        else if (lower.includes('fleet') || lower.includes('bus') || lower.includes('car') || lower.includes('van') || lower.includes('rental')) icon = '🚐';
                        else if (lower.includes('hotel') || lower.includes('resort') || lower.includes('suite') || lower.includes('lodge')) icon = '🏨';
                        else if (lower.includes('flight') || lower.includes('airline') || lower.includes('air') || lower.includes('ticket')) icon = '✈️';
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span>{icon}</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{name}</span>
                          </div>
                        );
                      },
                    },
                    { key: 'status', label: 'Status', render: (r: Booking) => <Badge>{r.status}</Badge> },
                    { key: 'pax', label: 'Pax', render: (r: Booking) => r.paxCount },
                    { key: 'total', label: 'Total', render: (r: Booking) => (r.totalPrice != null ? `${r.totalPrice} ${r.currency}` : '—') },
                  ]}
                  rows={data?.items ?? []}
                />
              </div>
            </div>
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

      {/* CUSTOMER DETAILS MODAL */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  );
}
