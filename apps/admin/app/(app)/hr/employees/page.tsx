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

interface Employee {
  id: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  hireDate?: string;
  baseSalary?: number | string;
  currency?: string;
  employmentStatus: string;
  emergencyContact?: string;
  notes?: string;
}

const STATUSES = ['ACTIVE', 'TERMINATED', 'ON_LEAVE'];

const initialForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  jobTitle: '',
  hireDate: '',
  baseSalary: '',
  currency: 'GHS',
  employmentStatus: 'ACTIVE',
  emergencyContact: '',
  notes: '',
};

export default function HrEmployeesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Employee> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<Employee>>(`/employees?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function loadIntoForm(e: Employee) {
    setEditing(e);
    setFormError(null);
    setForm({
      employeeCode: e.employeeCode ?? '',
      firstName: e.firstName ?? '',
      lastName: e.lastName ?? '',
      email: e.email ?? '',
      phone: e.phone ?? '',
      department: e.department ?? '',
      jobTitle: e.jobTitle ?? '',
      hireDate: e.hireDate ? e.hireDate.slice(0, 10) : '',
      baseSalary: e.baseSalary != null ? String(e.baseSalary) : '',
      currency: e.currency ?? 'GHS',
      employmentStatus: e.employmentStatus ?? 'ACTIVE',
      emergencyContact: e.emergencyContact ?? '',
      notes: e.notes ?? '',
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
      employeeCode: form.employeeCode || undefined,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      department: form.department || undefined,
      jobTitle: form.jobTitle || undefined,
      hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : undefined,
      baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
      currency: form.currency || undefined,
      employmentStatus: form.employmentStatus,
      emergencyContact: form.emergencyContact || undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/employees/${editing.id}`, body);
      } else {
        await api.post('/employees', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

    async function remove(e: Employee) {
    if (!window.confirm(`Delete staff record for ${e.firstName} ${e.lastName}?`)) return;
    try {
      await api.delete(`/employees/${e.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }


  return (
    <>
      <PageHeader
        title="Staff"
        subtitle={editing ? 'Edit staff record' : 'Add and manage staff data'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? <Button variant="secondary" onClick={reset}>Cancel edit</Button> : null}
            <Button variant="secondary" onClick={() => { reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              New staff
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit: ${editing.firstName} ${editing.lastName}` : 'Add staff'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="First name *" name="firstName" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name *" name="lastName" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <Input label="Employee code" name="employeeCode" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Department" name="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Input label="Job title" name="jobTitle" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            <Input label="Hire date" name="hireDate" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
            <Input label="Base salary" name="baseSalary" type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Select label="Employment status" name="employmentStatus" value={form.employmentStatus} onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            <Input label="Emergency contact" name="emergencyContact" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
          </div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <Textarea label="Notes" name="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add staff'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<Employee>
            keyOf={(e) => e.id}
            rows={data.items}
            columns={[
              { key: 'name', label: 'Name', render: (e) => `${e.firstName} ${e.lastName}` },
              { key: 'jobTitle', label: 'Job title', render: (e) => e.jobTitle ?? '—' },
              { key: 'department', label: 'Department', render: (e) => e.department ?? '—' },
              { key: 'email', label: 'Email', render: (e) => e.email ?? '—' },
              { key: 'phone', label: 'Phone', render: (e) => e.phone ?? '—' },
              { key: 'salary', label: 'Salary', render: (e) => (e.baseSalary != null ? `${e.currency ?? ''} ${e.baseSalary}` : '—') },
                {
                  key: 'status',
                  label: 'Status',
                  render: (e) => <Badge>{e.employmentStatus}</Badge>,
                },
              {
                key: 'actions',
                label: 'Actions',
                render: (e) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(e)}>Edit</Button>
                    <Button variant="danger" onClick={() => remove(e)}>Delete</Button>
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
