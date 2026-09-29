'use client';

import { useState } from 'react';
import { Button, Card, Input, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  country?: string;
  status: string;
}

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Customer>(`/customers?page=${page}&limit=10`, [page]);
  const initialForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    notes: '',
    scheduleFollowUp: false,
    followUpReminderDate: '',
    followUpReminderTitle: '',
    followUpReminderPriority: 'HIGH',
  };

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: Record<string, any> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        country: form.country || undefined,
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
      <PageHeader title="Customers" subtitle="Contacts and travellers managed on the platform" />
      <Card title="New customer">
        <form onSubmit={create}>
          <div className="form-grid">
            <Input label="First name" name="firstName" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Country" name="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
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
      <Card title="Customers">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', label: 'Name', render: (r) => `${r.firstName} ${r.lastName}` },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'country', label: 'Country' },
                { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              ]}
              rows={data?.items ?? []}
            />
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
