'use client';

import { useCallback, useEffect, useState } from 'react';
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

interface LeadItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: string;
}

const SOURCES = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'PHONE', 'EMAIL', 'OTHER'];
const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  source: 'OTHER',
  stage: 'NEW',
};

export default function CrmLeadsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<LeadItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<LeadItem>>(`/leads?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function loadIntoForm(l: LeadItem) {
    setEditing(l);
    setFormError(null);
    setForm({
      firstName: l.firstName ?? '',
      lastName: l.lastName ?? '',
      email: l.email ?? '',
      phone: l.phone ?? '',
      source: l.source ?? 'OTHER',
      stage: l.stage ?? 'NEW',
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
    const body = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      source: form.source || undefined,
      stage: form.stage,
    };
    try {
      if (editing) {
        await api.patch(`/leads/${editing.id}`, body);
      } else {
        await api.post('/leads', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(l: LeadItem) {
    const name = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || l.email || 'this lead';
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/leads/${l.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={editing ? 'Edit lead details' : 'Manage your sales leads'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <Button variant="secondary" onClick={reset}>
                Cancel edit
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              New lead
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit: ${editing.firstName} ${editing.lastName}` : 'New lead'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="First name" name="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" name="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select label="Source" name="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={SOURCES.map((s) => ({ value: s, label: s.replace('_', ' ') }))} />
            <Select label="Stage" name="stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} options={STAGES.map((s) => ({ value: s, label: s }))} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create lead'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<LeadItem>
            keyOf={(l) => l.id}
            rows={data.items}
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (l) => `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || '—',
              },
              { key: 'email', label: 'Email', render: (l) => l.email ?? '—' },
              { key: 'phone', label: 'Phone', render: (l) => l.phone ?? '—' },
              { key: 'source', label: 'Source', render: (l) => l.source?.replace('_', ' ') ?? '—' },
              { key: 'stage', label: 'Stage', render: (l) => <Badge>{l.stage ?? '—'}</Badge> },
              {
                key: 'actions',
                label: 'Actions',
                render: (l) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(l)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(l)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <Spinner />
      )}
    </>
  );
}
