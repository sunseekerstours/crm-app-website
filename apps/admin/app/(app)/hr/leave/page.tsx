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
  Textarea,
} from '@/components/ui';

interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: EmployeeRef;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  approvedAt?: string;
}

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER'];
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const initialForm = {
  employeeId: '',
  leaveType: 'ANNUAL',
  startDate: '',
  endDate: '',
  reason: '',
};

export default function HrLeavePage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<LeaveRequest> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeRef[]>([]);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<LeaveRequest>>(`/leave?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<Paginated<EmployeeRef>>('/employees?limit=200')
      .then((r) => setEmployees(r.items ?? []))
      .catch(() => undefined);
  }, []);

  function loadIntoForm(l: LeaveRequest) {
    setEditing(l);
    setFormError(null);
    setForm({
      employeeId: l.employeeId,
      leaveType: l.leaveType ?? 'ANNUAL',
      startDate: l.startDate ? l.startDate.slice(0, 10) : '',
      endDate: l.endDate ? l.endDate.slice(0, 10) : '',
      reason: l.reason ?? '',
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
      employeeId: form.employeeId,
      leaveType: form.leaveType,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      reason: form.reason || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/leave/${editing.id}`, body);
      } else {
        await api.post('/leave', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(l: LeaveRequest) {
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await api.delete(`/leave/${l.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function setStatus(l: LeaveRequest, status: 'APPROVED' | 'REJECTED') {
    try {
      await api.post(`/leave/${l.id}/approve`, { status });
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  return (
    <>
      <PageHeader
        title="Leave"
        subtitle={editing ? 'Edit leave request' : 'Manage staff leave requests'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? <Button variant="secondary" onClick={reset}>Cancel edit</Button> : null}
            <Button variant="secondary" onClick={() => { reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              New request
            </Button>
          </div>
        }
      />

      <Card title={editing ? 'Edit leave request' : 'New leave request'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Select
              label="Staff *"
              name="employeeId"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              options={employees.map((em) => ({ value: em.id, label: `${em.firstName} ${em.lastName}` }))}
            />
            <Select label="Leave type" name="leaveType" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} options={LEAVE_TYPES.map((t) => ({ value: t, label: t }))} />
            <Input label="Start date *" name="startDate" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End date *" name="endDate" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <Textarea label="Reason" name="reason" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create request'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<LeaveRequest>
            keyOf={(l) => l.id}
            rows={data.items}
            columns={[
              { key: 'staff', label: 'Staff', render: (l) => `${l.employee.firstName} ${l.employee.lastName}` },
              { key: 'type', label: 'Type', render: (l) => <Badge>{l.leaveType}</Badge> },
              { key: 'start', label: 'Start', render: (l) => new Date(l.startDate).toLocaleDateString() },
              { key: 'end', label: 'End', render: (l) => new Date(l.endDate).toLocaleDateString() },
              { key: 'status', label: 'Status', render: (l) => <Badge>{l.status}</Badge> },
              {
                key: 'actions',
                label: 'Actions',
                render: (l) => (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {l.status === 'PENDING' ? (
                      <>
                        <Button variant="secondary" onClick={() => setStatus(l, 'APPROVED')}>Approve</Button>
                        <Button variant="danger" onClick={() => setStatus(l, 'REJECTED')}>Reject</Button>
                      </>
                    ) : null}
                    <Button variant="ghost" onClick={() => loadIntoForm(l)}>Edit</Button>
                    <Button variant="danger" onClick={() => remove(l)}>Delete</Button>
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
