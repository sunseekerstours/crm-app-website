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

interface TourItem {
  id: string;
  name: string;
  slug?: string;
  summary?: string;
  description?: string;
  type?: string;
  difficulty?: string;
  durationDays?: number;
  minPax?: number;
  maxPax?: number;
  basePrice?: number | string;
  currency?: string;
  coverImage?: string;
  status: string;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
  destinations?: { destination: { id: string; name: string } }[];
}

interface Destination {
  id: string;
  name: string;
}

const STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const TOUR_TYPES = ['ADVENTURE', 'CULTURAL', 'BEACH', 'SAFARI', 'WILDLIFE', 'LUXURY', 'OTHER'];

const initialForm = {
  name: '',
  slug: '',
  summary: '',
  description: '',
  type: '',
  difficulty: '',
  durationDays: '',
  minPax: '',
  maxPax: '',
  basePrice: '',
  currency: 'GHS',
  coverImage: '',
  status: 'DRAFT',
  destinationIds: [] as string[],
  inclusions: '',
  exclusions: '',
  highlights: '',
};

export default function CrmToursPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<TourItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [editing, setEditing] = useState<TourItem | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<TourItem>>(`/tours?limit=50&page=${page}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tours');
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<Paginated<Destination>>('/destinations?limit=200')
      .then((r) => setDestinations(r.items ?? []))
      .catch(() => undefined);
  }, []);

  function loadIntoForm(t: TourItem) {
    setEditing(t);
    setFormError(null);
    setForm({
      name: t.name ?? '',
      slug: t.slug ?? '',
      summary: t.summary ?? '',
      description: t.description ?? '',
      type: t.type ?? '',
      difficulty: t.difficulty ?? '',
      durationDays: t.durationDays != null ? String(t.durationDays) : '',
      minPax: t.minPax != null ? String(t.minPax) : '',
      maxPax: t.maxPax != null ? String(t.maxPax) : '',
      basePrice: t.basePrice != null ? String(t.basePrice) : '',
      currency: t.currency ?? 'GHS',
      coverImage: t.coverImage ?? '',
      status: t.status ?? 'DRAFT',
      destinationIds: (t.destinations ?? []).map((d) => d.destination.id),
      inclusions: (t.inclusions ?? []).join(', '),
      exclusions: (t.exclusions ?? []).join(', '),
      highlights: (t.highlights ?? []).join(', '),
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
      name: form.name,
      slug: form.slug || undefined,
      summary: form.summary || undefined,
      description: form.description || undefined,
      type: form.type || undefined,
      difficulty: form.difficulty || undefined,
      durationDays: form.durationDays ? Number(form.durationDays) : undefined,
      minPax: form.minPax ? Number(form.minPax) : undefined,
      maxPax: form.maxPax ? Number(form.maxPax) : undefined,
      basePrice: form.basePrice ? Number(form.basePrice) : undefined,
      currency: form.currency || undefined,
      coverImage: form.coverImage || undefined,
      status: form.status,
      destinationIds: form.destinationIds,
      inclusions: form.inclusions.split(',').map((s) => s.trim()).filter(Boolean),
      exclusions: form.exclusions.split(',').map((s) => s.trim()).filter(Boolean),
      highlights: form.highlights.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await api.patch(`/tours/${editing.id}`, body);
      } else {
        await api.post('/tours', body);
      }
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(t: TourItem) {
    if (!window.confirm(`Delete tour "${t.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tours/${t.id}`);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function toggleDestination(id: string) {
    setForm((f) => ({
      ...f,
      destinationIds: f.destinationIds.includes(id)
        ? f.destinationIds.filter((d) => d !== id)
        : [...f.destinationIds, id],
    }));
  }

  return (
    <>
      <PageHeader
        title="Tours"
        subtitle={editing ? 'Edit tour and itinerary details' : 'Product catalogue of tours and itineraries'}
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
              New tour
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit: ${editing.name}` : 'New tour'}>
        <form onSubmit={submit}>
          <div className="form-grid">
            <Input label="Name *" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Slug" name="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. accra-city-tour" />
            <Input label="Type" name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. CULTURAL" />
            <Input label="Difficulty" name="difficulty" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} />
            <Input label="Duration (days)" name="durationDays" type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            <Input label="Min pax" name="minPax" type="number" value={form.minPax} onChange={(e) => setForm({ ...form, minPax: e.target.value })} />
            <Input label="Max pax" name="maxPax" type="number" value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: e.target.value })} />
            <Input label="Base price" name="basePrice" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            <Input label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Select label="Status" name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            <Input label="Cover image URL" name="coverImage" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://.../image.jpg" />
          </div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <Textarea label="Summary" name="summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <Textarea label="Description" name="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Textarea label="Inclusions (comma separated)" name="inclusions" rows={2} value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} />
            <Textarea label="Exclusions (comma separated)" name="exclusions" rows={2} value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} />
            <Textarea label="Highlights (comma separated)" name="highlights" rows={2} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <span className="field-label">Destinations</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {destinations.map((d) => {
                const active = form.destinationIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => toggleDestination(d.id)}
                  >
                    {d.name}
                  </button>
                );
              })}
              {destinations.length === 0 ? <span style={{ color: 'var(--muted)' }}>No destinations available</span> : null}
            </div>
          </div>
          {form.coverImage ? (
            <div style={{ marginTop: 14 }}>
              <span className="field-label">Cover image preview</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.coverImage} alt="" style={{ maxWidth: 320, maxHeight: 180, borderRadius: 8, marginTop: 6 }} />
            </div>
          ) : null}
          {formError ? <div className="error-state" style={{ marginTop: 12 }}>{formError}</div> : null}
          <div className="form-actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create tour'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <Table<TourItem>
            keyOf={(t) => t.id}
            rows={data.items}
            columns={[
              {
                key: 'cover',
                label: 'Image',
                render: (t) =>
                  t.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.coverImage} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>—</span>
                  ),
              },
              { key: 'name', label: 'Tour', render: (t) => t.name },
              {
                key: 'destinations',
                label: 'Destinations',
                render: (t) => (t.destinations?.map((d) => d.destination.name).join(', ') ?? '—'),
              },
              {
                key: 'price',
                label: 'Price',
                render: (t) => (t.basePrice != null ? `${t.currency ?? ''} ${t.basePrice}` : '—'),
              },
              { key: 'durationDays', label: 'Days', render: (t) => t.durationDays ?? '—' },
              { key: 'status', label: 'Status', render: (t) => <Badge>{t.status}</Badge> },
              {
                key: 'actions',
                label: 'Actions',
                render: (t) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(t)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => remove(t)}>
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
