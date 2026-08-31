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

interface PerformanceReview {
  id: string;
  employeeId: string;
  employee: EmployeeRef;
  reviewDate: string;
  rating: string;
  score?: number;
  goals?: string;
  achievements?: string;
  strengths?: string;
  improvements?: string;
  feedback?: string;
}

const RATINGS = ['EXCEEDS', 'MEETS', 'BELOW', 'NEEDS_IMPROVEMENT'];

const initialForm = {
  employeeId: '',
  reviewDate: '',
  rating: 'MEETS',
  score: '',
  goals: '',
  achievements: '',
  strengths: '',
  improvements: '',
  feedback: '',
};

export default function HrPerformancePage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<PerformanceReview> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeRef[]>([]);
  const [editing, setEditing] = useState<PerformanceReview | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<PerformanceReview>>(`/performance?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance reviews');
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

  function loadIntoForm(r: PerformanceReview) {
    setEditing(r);
    setFormError(null);
    setForm({
      employeeId: r.employeeId,
      reviewDate: r.reviewDate ? r.reviewDate.slice(0, 10) : '',
      rating: r.rating ?? 'MEETS',
      score: r.score != null ? String(r.score) : '',
      goals: r.goals ?? '',
      achievements: r.achievements ?? '',
      strengths: r.strengths ?? '',
      improvements: r.improvements ?? '',
      feedback: r.feedback ?? '',
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
      reviewDate: form.reviewDate ? new Date(form.reviewDate).toISOString() : undefined,
      rating: form.rating,
      score: form.score ? Number(form.score) : undefined,
      goals: form.goals || undefined,
      achievements: form.achievements || undefined,
      strengths: form.strengths || undefined,
      improvements: form.improvements || undefined,
      feedback: form.feedback || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/performance/${editing.id}`, body);
      } else {
        await api.post('/performance', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(r: PerformanceReview) {
    if (!window.confirm('Delete this performance review?')) return;
    try {
      await api.delete(`/performance/${r.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Performance"
        subtitle={editing ? 'Edit performance review' : 'Manage staff performance reviews'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? <Button variant="secondary" onClick={reset}>Cancel edit</Button> : null}
            <Button variant="secondary" onClick={() => { reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              New review
            </Button>
          </div>
        }
      />

      <Card title={editing ? 'Edit review' : 'New performance review'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Select
              label="Staff *"
              name="employeeId"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              options={employees.map((em) => ({ value: em.id, label: `${em.firstName} ${em.lastName}` }))}
            />
            <Input label="Review date *" name="reviewDate" type="date" required value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} />
            <Select label="Rating" name="rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} options={RATINGS.map((r) => ({ value: r, label: r }))} />
            <Input label="Score (0-100)" name="score" type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
          </div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <Textarea label="Goals" name="goals" rows={2} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
            <Textarea label="Achievements" name="achievements" rows={2} value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
            <Textarea label="Strengths" name="strengths" rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
            <Textarea label="Areas for improvement" name="improvements" rows={2} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} />
            <Textarea label="Feedback" name="feedback" rows={3} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
          </div>
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add review'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<PerformanceReview>
            keyOf={(r) => r.id}
            rows={data.items}
            columns={[
              { key: 'staff', label: 'Staff', render: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
              { key: 'date', label: 'Review date', render: (r) => new Date(r.reviewDate).toLocaleDateString() },
              { key: 'rating', label: 'Rating', render: (r) => <Badge>{r.rating}</Badge> },
              { key: 'score', label: 'Score', render: (r) => (r.score != null ? `${r.score}` : '—') },
              { key: 'goals', label: 'Goals', render: (r) => r.goals ?? '—' },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(r)}>Edit</Button>
                    <Button variant="danger" onClick={() => remove(r)}>Delete</Button>
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
