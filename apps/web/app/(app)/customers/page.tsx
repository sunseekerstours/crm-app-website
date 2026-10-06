'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';
import { CustomerDetailsModal } from '@/components/CustomerDetailsModal';
import { PhoneBadge } from '@/components/PhoneBadge';
import { formatDisplayPhone } from '@/lib/phone';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  country?: string;
  status: string;
  tags?: string[];
  company?: { id: string; name: string };
}

function getTagBadgeStyle(tag: string): { bg: string; color: string; border: string } {
  const t = tag.toLowerCase();
  if (t.includes('wtm') || t.includes('itb') || t.includes('clia') || t.includes('kenya') || t.includes('seatrade') || t.includes('blitz') || t.includes('sales trip') || t.includes('fair')) {
    return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }; // Blue for trade fairs & sales trips
  }
  if (t.includes('lead') || t.includes('website') || t.includes('form') || t.includes('inquiry') || t.includes('enquiry')) {
    return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }; // Emerald for inbound web/forms
  }
  if (t.includes('tour') || t.includes('ghana') || t.includes('africa') || t.includes('inbound') || t.includes('outbound')) {
    return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' }; // Purple for tours & destinations
  }
  if (t.includes('ticket') || t.includes('transport') || t.includes('flight') || t.includes('hotel')) {
    return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' }; // Amber for logistics & travel services
  }
  return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }; // Slate gray default
}

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '10');
  if (search.trim()) queryParams.set('search', search.trim());
  if (selectedTag) queryParams.set('tag', selectedTag);

  const { data, loading, error, reload } = useList<Customer>(`/customers?${queryParams.toString()}`, [page, search, selectedTag]);

  // Load unique tags for filter dropdown
  useEffect(() => {
    api.get<string[]>('/customers/tags')
      .then((tags) => {
        if (Array.isArray(tags)) setAvailableTags(tags);
      })
      .catch(() => {});
  }, []);

  const initialForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    tagsInput: '',
    notes: '',
    scheduleFollowUp: false,
    followUpReminderDate: '',
    followUpReminderTitle: '',
    followUpReminderPriority: 'HIGH',
  };

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View Customer Profile Modal
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    status: 'ACTIVE',
    tagsInput: '',
    notes: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditModal(c: Customer) {
    setEditingCustomer(c);
    setEditError(null);
    setEditForm({
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      phone: formatDisplayPhone(c.phone),
      country: c.country ?? '',
      status: c.status ?? 'ACTIVE',
      tagsInput: (c.tags || []).join(', '),
      notes: '',
    });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const parsedTags = editForm.tagsInput
        .split(/[,|;]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Record<string, any> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        country: editForm.country || undefined,
        status: editForm.status,
        tags: parsedTags,
      };

      await api.patch(`/customers/${editingCustomer.id}`, payload);
      if (editForm.notes.trim()) {
        await api.post(`/customers/${editingCustomer.id}/notes`, { content: editForm.notes.trim() }).catch(() => {});
      }
      setEditingCustomer(null);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const parsedTags = form.tagsInput
        .split(/[,|;]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Record<string, any> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        country: form.country || undefined,
        tags: parsedTags.length ? parsedTags : undefined,
        notes: form.notes || undefined,
      };

      if (form.scheduleFollowUp && form.followUpReminderDate) {
        payload.followUpReminderDate = new Date(form.followUpReminderDate).toISOString();
        payload.followUpReminderTitle = form.followUpReminderTitle || `Follow up with ${form.firstName} ${form.lastName}`;
        payload.followUpReminderPriority = form.followUpReminderPriority;
      }

      await api.post('/customers', payload);
      setForm(initialForm);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle="Contacts and travellers synchronized across Jetpack CRM and WordPress" />

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search customer by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
            />
          </div>

          <div style={{ flex: '0 1 260px', minWidth: 200 }}>
            <select
              className="input"
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
            >
              <option value="">🏷️ Filter by Tag (All Tags)</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedTag) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedTag('');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          )}

          <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            {data?.total !== undefined ? `${data.total} total matching customers` : ''}
          </div>
        </div>
      </Card>

      <Card title="New Customer">
        <form onSubmit={create}>
          <div className="form-grid">
            <Input label="First name" name="firstName" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Country" name="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Input
              label="Data Tags (comma-separated)"
              name="tagsInput"
              placeholder="e.g. WTM London 2025, Lead-Website-Form, Tour-Ghana"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            />
          </div>

          {/* Initial Customer Notes / Special Requirements */}
          <div style={{ marginTop: 14 }}>
            <label className="field">
              <span className="field-label">Customer Notes &amp; Preferences</span>
              <textarea
                className="input"
                rows={3}
                placeholder="Add background notes, travel preferences, dietary requests, or referral details..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </label>
          </div>

          {/* Set Follow-Up Reminder */}
          <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={form.scheduleFollowUp}
                onChange={(e) => setForm({ ...form, scheduleFollowUp: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--brand, #0f766e)' }}
              />
              <span>⏰ Schedule Follow-up Reminder</span>
            </label>

            {form.scheduleFollowUp && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
                <Input
                  label="Follow-up Date & Time"
                  name="followUpReminderDate"
                  type="datetime-local"
                  required={form.scheduleFollowUp}
                  value={form.followUpReminderDate}
                  onChange={(e) => setForm({ ...form, followUpReminderDate: e.target.value })}
                />
                <Input
                  label="Reminder Reason / Task Title"
                  name="followUpReminderTitle"
                  placeholder="e.g. Call to discuss Ghana itinerary"
                  value={form.followUpReminderTitle}
                  onChange={(e) => setForm({ ...form, followUpReminderTitle: e.target.value })}
                />
                <label className="field">
                  <span className="field-label">Priority</span>
                  <select
                    className="input"
                    value={form.followUpReminderPriority}
                    onChange={(e) => setForm({ ...form, followUpReminderPriority: e.target.value })}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create customer'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>Customers {data?.total !== undefined ? `(${data.total})` : ''}</span>
            {selectedTag && (
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0f766e' }}>
                Filtered by tag: <strong>{selectedTag}</strong>
              </span>
            )}
          </div>
        }
      >
        {loading ? (
          <Spinner />
        ) : error ? (
          <div style={{ padding: '16px 0' }}>
            <ErrorState message={error} />
            {error.toLowerCase().includes('unauthor') && (
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
                  Your session has expired or requires re-authentication.
                </p>
                <Button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('sunseekers_access_token');
                      window.localStorage.removeItem('sunseekers_refresh_token');
                      window.localStorage.removeItem('sunseekers_user');
                      window.location.href = '/login?expired=1&redirect=/customers';
                    }
                  }}
                >
                  Sign In Again
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'name',
                  label: 'Name & Organization',
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {r.firstName} {r.lastName}
                      </div>
                      {r.company?.name && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          🏢 {r.company.name}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'contact',
                  label: 'Contact Details',
                  render: (r) => (
                    <div style={{ display: 'grid', gap: '4px' }}>
                      {r.email && (
                        <a
                          href={`mailto:${r.email}`}
                          style={{ color: '#0284c7', textDecoration: 'none', fontSize: '13px' }}
                        >
                          ✉️ {r.email}
                        </a>
                      )}
                      {r.phone && (
                        <PhoneBadge
                          phone={r.phone}
                          countryHint={r.country}
                          compact={true}
                          showWhatsApp={true}
                          showCall={true}
                        />
                      )}
                      {!r.email && !r.phone && <span style={{ color: '#94a3b8', fontSize: '12px' }}>No contact details</span>}
                    </div>
                  ),
                },
                { key: 'country', label: 'Country', render: (r) => r.country || <span style={{ color: '#94a3b8' }}>—</span> },
                {
                  key: 'tags',
                  label: 'Data Tags',
                  render: (r) => {
                    const tags = r.tags || [];
                    if (tags.length === 0) return <span style={{ color: '#94a3b8' }}>—</span>;
                    const displayTags = tags.slice(0, 3);
                    const remaining = tags.length - 3;

                    return (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 300 }}>
                        {displayTags.map((t) => {
                          const style = getTagBadgeStyle(t);
                          return (
                            <span
                              key={t}
                              onClick={() => setSelectedTag(t)}
                              title={`Click to filter by ${t}`}
                              style={{
                                display: 'inline-block',
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: style.bg,
                                color: style.color,
                                border: `1px solid ${style.border}`,
                                fontWeight: 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t}
                            </span>
                          );
                        })}
                        {remaining > 0 && (
                          <span
                            title={tags.slice(3).join(', ')}
                            style={{
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 12,
                              background: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              fontWeight: 500,
                            }}
                          >
                            +{remaining} more
                          </span>
                        )}
                      </div>
                    );
                  },
                },
                { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (r: Customer) => (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setViewCustomerId(r.id)}
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
                        title="View complete customer profile and history"
                      >
                        👁️ View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(r)}
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
                        title="Edit customer information"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={data?.items ?? []}
            />
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCustomer(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  ✏️ Edit Customer Profile
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {editingCustomer.firstName} {editingCustomer.lastName} • {editingCustomer.company?.name || 'Individual Client'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
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

            <form onSubmit={submitEdit} style={{ padding: '24px', overflowY: 'auto', display: 'grid', gap: '16px' }}>
              <div className="form-grid">
                <Input
                  label="First Name"
                  name="firstName"
                  required
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  required
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
                <Input
                  label="Phone"
                  name="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
                <Input
                  label="Country"
                  name="country"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
                <label className="field">
                  <span className="field-label">Status</span>
                  <select
                    className="input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="LEAD">LEAD</option>
                  </select>
                </label>
              </div>

              <Input
                label="Data Tags (comma-separated)"
                name="tagsInput"
                placeholder="e.g. WTM London 2025, Lead-Website-Form, Tour-Ghana"
                value={editForm.tagsInput}
                onChange={(e) => setEditForm({ ...editForm, tagsInput: e.target.value })}
              />

              <div>
                <label className="field">
                  <span className="field-label">Add Note / Interaction Record</span>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Add an update or note to this customer's profile history..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </label>
              </div>

              {editError && <div className="error-state">{editError}</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <Button variant="secondary" onClick={() => setEditingCustomer(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving…' : '✓ Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAILS PROFILE MODAL */}
      <CustomerDetailsModal
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  );
}
