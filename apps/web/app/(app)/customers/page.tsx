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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', country: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/customers', form);
      setForm({ firstName: '', lastName: '', email: '', phone: '', country: '' });
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
          {formError ? <div className="error-state">{formError}</div> : null}
          <div className="form-actions">
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
