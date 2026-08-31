'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

interface LinkedTour {
  id: string;
  name: string;
  slug?: string;
  durationDays?: number;
  status?: string;
  coverImage?: string;
}

interface DestinationItem {
  id: string;
  name: string;
  country?: string;
  region?: string;
  slug: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  coverImage?: string;
  images?: string[];
  isActive: boolean;
  tours?: { tour: LinkedTour }[];
  _count?: { tours: number };
}

const initialForm = {
  name: '',
  country: 'Ghana',
  region: '',
  slug: '',
  summary: '',
  description: '',
  coverImage: '',
  images: [] as string[],
  newImageUrl: '',
  highlights: '',
  isActive: true,
};

export default function CrmDestinationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [data, setData] = useState<Paginated<DestinationItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<DestinationItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewingToursFor, setViewingToursFor] = useState<DestinationItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        limit: '20',
        page: String(page),
      });
      if (search) q.set('search', search);
      if (countryFilter) q.set('country', countryFilter);

      const res = await api.get<Paginated<DestinationItem>>(`/destinations?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  }, [page, search, countryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditing(null);
    setForm(initialForm);
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(item: DestinationItem) {
    setEditing(item);
    setFormError(null);
    setForm({
      name: item.name ?? '',
      country: item.country ?? '',
      region: item.region ?? '',
      slug: item.slug ?? '',
      summary: item.summary ?? '',
      description: item.description ?? '',
      coverImage: item.coverImage ?? '',
      images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
      newImageUrl: '',
      highlights: (item.highlights ?? []).join(', '),
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addImageToForm() {
    if (!form.newImageUrl.trim()) return;
    setForm((f) => ({
      ...f,
      images: [...f.images, f.newImageUrl.trim()],
      newImageUrl: '',
    }));
  }

  function removeImage(index: number) {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const body = {
      name: form.name.trim(),
      country: form.country.trim() || undefined,
      region: form.region.trim() || undefined,
      slug: form.slug.trim() || undefined,
      summary: form.summary.trim() || undefined,
      description: form.description.trim() || undefined,
      coverImage: form.coverImage.trim() || undefined,
      images: form.images.filter(Boolean),
      highlights: form.highlights
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await api.patch(`/destinations/${editing.id}`, body);
      } else {
        await api.post('/destinations', body);
      }
      setShowForm(false);
      setEditing(null);
      setForm(initialForm);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save destination');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(item: DestinationItem) {
    const tourCount = item._count?.tours ?? item.tours?.length ?? 0;
    if (tourCount > 0) {
      if (!confirm(`Warning: This destination is linked to ${tourCount} tour(s). Are you sure you want to delete it?`)) {
        return;
      }
    } else if (!confirm(`Delete destination "${item.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/destinations/${item.id}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete destination');
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const activeCount = items.filter((i) => i.isActive).length;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        title="Destinations"
        subtitle="Manage travel destinations, photo galleries, descriptions, and linked tour packages"
        action={
          !showForm ? (
            <Button onClick={startCreate}>+ Add Destination</Button>
          ) : (
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          )
        }
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Destinations</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{total}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Active Destinations</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a', marginTop: '4px' }}>{activeCount}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase' }}>Available Countries</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#f97316', marginTop: '4px' }}>
            {Array.from(new Set(items.map((i) => i.country).filter(Boolean))).length || 1}
          </div>
        </div>
      </div>

      {/* Destination Create / Edit Form */}
      {showForm && (
        <Card title={editing ? `Edit Destination: ${editing.name}` : 'New Travel Destination'}>
          {formError && <ErrorState message={formError} />}
          <form onSubmit={submit} style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <Input
                label="Destination Name *"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Accra, Cape Coast, Dubai, Singapore"
                required
              />
              <Input
                label="Country"
                name="country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="e.g. Ghana, UAE, Singapore, Kenya"
              />
              <Input
                label="Region / State / City"
                name="region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="e.g. Greater Accra, Central Region, Downtown"
              />
              <Input
                label="Slug (optional)"
                name="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. accra-ghana (auto-generated if empty)"
              />
            </div>

            <Textarea
              label="Summary (Short description for tour cards & badges)"
              name="summary"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="e.g. Ghana's lively coastal capital known for rich colonial history, bustling markets, and energetic nightlife."
              rows={2}
            />

            <Textarea
              label="Detailed Description"
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Full guide and background about this destination, landmarks, climate, and cultural significance..."
              rows={4}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              <Input
                label="Cover Image URL (Primary Photo)"
                name="coverImage"
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                placeholder="https://images.unsplash.com/... or media URL"
              />
              {form.coverImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={form.coverImage}
                    alt="Cover preview"
                    style={{ width: '120px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Primary cover preview</span>
                </div>
              )}
            </div>

            {/* Additional Photo Gallery */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                Photo Gallery / Additional Pictures ({form.images.length})
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Paste additional image URL (e.g. landmark, resort, culture)"
                  value={form.newImageUrl}
                  onChange={(e) => setForm({ ...form, newImageUrl: e.target.value })}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <Button variant="secondary" onClick={addImageToForm}>
                  + Add Picture
                </Button>
              </div>

              {form.images.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {form.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '100px',
                        height: '70px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      <img src={imgUrl} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="Key Highlights / Attractions (comma-separated)"
              name="highlights"
              value={form.highlights}
              onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              placeholder="e.g. Independence Arch, Cape Coast Castle, Rainforest Canopy Walk, Burj Khalifa"
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Active (Visible on Website &amp; Tours)</span>
            </label>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update Destination' : 'Create Destination'}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Linked Tours Modal/Drawer */}
      {viewingToursFor && (
        <Card
          title={`Tours linked to: ${viewingToursFor.name}`}
          action={
            <Button variant="ghost" onClick={() => setViewingToursFor(null)}>
              ✕ Close
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {viewingToursFor.tours && viewingToursFor.tours.length > 0 ? (
              viewingToursFor.tours.map(({ tour }) => (
                <div
                  key={tour.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {tour.coverImage && (
                      <img
                        src={tour.coverImage}
                        alt={tour.name}
                        style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{tour.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {tour.durationDays ? `${tour.durationDays} Days` : ''} • Status: {tour.status || 'ACTIVE'}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/crm/tours`}
                    style={{
                      fontSize: '13px',
                      color: '#008744',
                      fontWeight: '700',
                      textDecoration: 'none',
                    }}
                  >
                    View in Tours →
                  </Link>
                </div>
              ))
            ) : (
              <div style={{ color: '#64748b', fontSize: '14px' }}>No tours currently assigned to this destination.</div>
            )}
          </div>
        </Card>
      )}

      {/* Destinations List */}
      <Card
        title="All Destinations"
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="search"
              placeholder="Search destinations..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        }
      >
        {error && <ErrorState message={error} />}
        {loading && !data && <Spinner />}

        <Table<DestinationItem>
          rows={items}
          columns={[
            {
              key: 'photo',
              label: 'Photo',
              render: (r) => (
                <div style={{ position: 'relative', width: '56px', height: '40px' }}>
                  {r.coverImage ? (
                    <img
                      src={r.coverImage}
                      alt={r.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: '#e2e8f0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                      }}
                    >
                      📍
                    </div>
                  )}
                  {Array.isArray(r.images) && r.images.length > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        background: '#0f172a',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '1px 4px',
                        borderRadius: '4px',
                      }}
                    >
                      +{r.images.length}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'name',
              label: 'Destination',
              render: (r) => (
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {r.region ? `${r.region}, ` : ''}
                    {r.country || 'Ghana'}
                  </div>
                </div>
              ),
            },
            {
              key: 'slug',
              label: 'Slug',
              render: (r) => <span style={{ fontSize: '13px', color: '#475569', fontFamily: 'monospace' }}>{r.slug}</span>,
            },
            {
              key: 'tours',
              label: 'Linked Tours',
              render: (r) => {
                const count = r._count?.tours ?? r.tours?.length ?? 0;
                return (
                  <button
                    type="button"
                    onClick={() => setViewingToursFor(r)}
                    style={{
                      background: count > 0 ? '#e0f2fe' : '#f1f5f9',
                      color: count > 0 ? '#0284c7' : '#64748b',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {count} {count === 1 ? 'Tour' : 'Tours'} ↗
                  </button>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <Badge>
                  <span style={{ color: r.isActive ? '#16a34a' : '#64748b', fontWeight: 'bold' }}>
                    {r.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" onClick={() => startEdit(r)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => remove(r)}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />

        {data && (
          <div style={{ marginTop: '16px' }}>
            <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>
    </div>
  );
}
