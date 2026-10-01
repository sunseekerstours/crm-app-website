'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api, type Paginated } from '@/lib/api';
import { CustomerSearchPicker, CustomerSummary } from '@/components/CustomerSearchPicker';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';

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

          <div className="form-grid">
            <Input label="Tour name" name="tourName" placeholder="e.g. Cape Coast & Elmina Castle Tour" value={form.tourName} onChange={(e) => setForm({ ...form, tourName: e.target.value })} />
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
                            width: 32,
                            height: 32,
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
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{custName}</span>
                            {custId && (
                              <button
                                type="button"
                                onClick={() => setViewCustomerId(custId)}
                                style={{
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                }}
                              >
                                👁️ View
                              </button>
                            )}
                          </div>
                          {cust?.phone && <span style={{ fontSize: 11, color: '#64748b' }}>📞 {cust.phone}</span>}
                        </div>
                      </div>
                    );
                  },
                },
                { key: 'tourName', label: 'Tour', render: (r: Booking) => r.tourName || '—' },
                { key: 'status', label: 'Status', render: (r: Booking) => <Badge>{r.status}</Badge> },
                { key: 'pax', label: 'Pax', render: (r: Booking) => r.paxCount },
                { key: 'total', label: 'Total', render: (r: Booking) => (r.totalPrice != null ? `${r.totalPrice} ${r.currency}` : '—') },
              ]}
              rows={data?.items ?? []}
            />
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
