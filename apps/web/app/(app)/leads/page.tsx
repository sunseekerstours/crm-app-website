'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, PageHeader, Table, Pagination, Spinner, ErrorState, Badge } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source: string;
  stage: string;
  estimatedValue?: number;
}

const SOURCES = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'PHONE', 'EMAIL', 'OTHER'];
const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useList<Lead>(`/leads?page=${page}&limit=10`, [page]);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', source: SOURCES[0] });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/leads', form);
      setForm({ firstName: '', lastName: '', email: '', phone: '', source: SOURCES[0] });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Leads" subtitle="Incoming enquiries and prospects" />
      <Card title="New lead">
        <form onSubmit={create}>
          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select label="Source" name="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={SOURCES.map((s) => ({ value: s, label: s }))} />
          </div>
          {formError ? <div className="error-state">{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create lead'}
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Leads">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', label: 'Name', render: (r) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'source', label: 'Source', render: (r) => <Badge>{r.source}</Badge> },
                { key: 'stage', label: 'Stage', render: (r) => <Badge>{r.stage}</Badge> },
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
