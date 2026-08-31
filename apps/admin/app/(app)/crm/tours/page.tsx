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

interface TourPricingItem {
  id?: string;
  name: string;
  persons: number | string;
  price: number | string;
  currency: string;
  discountPercent?: number | string;
  discountPrice?: number | string;
  isCustom?: boolean;
  note?: string;
}

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
  startDate?: string;
  endDate?: string;
  availabilityNote?: string;
  coverImage?: string;
  images?: string[];
  videoUrl?: string;
  status: string;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
  destinations?: { destination: { id: string; name: string; country?: string; region?: string } }[];
  pricing?: TourPricingItem[];
}

interface Destination {
  id: string;
  name: string;
  country?: string;
  region?: string;
}

interface TourDay {
  id?: string;
  dayNumber: number;
  title?: string;
  description?: string;
  meals?: string[] | string;
  accommodation?: string;
  destinationId?: string;
}

const STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const TOUR_TYPES = ['ADVENTURE', 'CULTURAL', 'BEACH', 'SAFARI', 'WILDLIFE', 'LUXURY', 'FESTIVAL', 'OTHER'];
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GHS', label: 'GHS (₵)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const initialForm = {
  name: '',
  slug: '',
  summary: '',
  description: '',
  type: 'CULTURAL',
  difficulty: 'MODERATE',
  durationDays: '',
  minPax: '1',
  maxPax: '20',
  basePrice: '',
  currency: 'USD',
  startDate: '',
  endDate: '',
  availabilityNote: '',
  coverImage: '',
  images: [] as string[],
  videoUrl: '',
  status: 'DRAFT',
  destinationIds: [] as string[],
  inclusions: '',
  exclusions: '',
  highlights: '',
  days: [] as TourDay[],
  pricing: [] as TourPricingItem[],
};

export default function CrmToursPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
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
      const q = new URLSearchParams({
        limit: '50',
        page: String(page),
      });
      if (search) q.set('search', search);

      const res = await api.get<Paginated<TourItem>>(`/tours?${q.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tours');
    }
  }, [page, search]);

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
      type: t.type ?? 'CULTURAL',
      difficulty: t.difficulty ?? 'MODERATE',
      durationDays: t.durationDays != null ? String(t.durationDays) : '',
      minPax: t.minPax != null ? String(t.minPax) : '1',
      maxPax: t.maxPax != null ? String(t.maxPax) : '',
      basePrice: t.basePrice != null ? String(t.basePrice) : '',
      currency: t.currency ?? 'USD',
      startDate: t.startDate ? t.startDate.substring(0, 10) : '',
      endDate: t.endDate ? t.endDate.substring(0, 10) : '',
      availabilityNote: t.availabilityNote ?? '',
      coverImage: t.coverImage ?? '',
      images: Array.isArray(t.images) ? t.images.filter(Boolean) : [],
      videoUrl: t.videoUrl ?? '',
      status: t.status ?? 'DRAFT',
      destinationIds: (t.destinations ?? []).map((d) => d.destination.id),
      inclusions: (t.inclusions ?? []).join(', '),
      exclusions: (t.exclusions ?? []).join(', '),
      highlights: (t.highlights ?? []).join(', '),
      days: [],
      pricing: Array.isArray(t.pricing)
        ? t.pricing.map((p) => ({
            id: p.id,
            name: p.name ?? '',
            persons: p.persons != null ? p.persons : 1,
            price: p.price != null ? p.price : '',
            currency: p.currency ?? 'USD',
            discountPercent: p.discountPercent != null ? p.discountPercent : '',
            discountPrice: p.discountPrice != null ? p.discountPrice : '',
            isCustom: p.isCustom ?? false,
            note: p.note ?? '',
          }))
        : [],
    });
    void loadDays(t.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function loadDays(tourId: string) {
    try {
      const full = await api.get<TourItem & { days?: TourDay[]; pricing?: TourPricingItem[] }>(`/tours/${tourId}`);
      const days = Array.isArray(full.days) ? full.days : [];
      const pricing = Array.isArray(full.pricing) ? full.pricing : [];
      setForm((f) => ({
        ...f,
        days: days.map((d, i) => ({
          id: d.id,
          dayNumber: d.dayNumber ?? i + 1,
          title: d.title ?? '',
          description: d.description ?? '',
          meals: Array.isArray(d.meals) ? d.meals.join(', ') : (d.meals ?? ''),
          accommodation: d.accommodation ?? '',
          destinationId: d.destinationId ?? '',
        })),
        pricing:
          pricing.length > 0
            ? pricing.map((p) => ({
                id: p.id,
                name: p.name ?? '',
                persons: p.persons != null ? p.persons : 1,
                price: p.price != null ? p.price : '',
                currency: p.currency ?? 'USD',
                discountPercent: p.discountPercent != null ? p.discountPercent : '',
                discountPrice: p.discountPrice != null ? p.discountPrice : '',
                isCustom: p.isCustom ?? false,
                note: p.note ?? '',
              }))
            : f.pricing,
      }));
    } catch {
      // ignore
    }
  }

  function updateDay(index: number, patch: Partial<TourDay>) {
    setForm((f) => {
      const days = f.days.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...f, days };
    });
  }

  function addDay() {
    setForm((f) => ({
      ...f,
      days: [
        ...f.days,
        {
          dayNumber: f.days.length + 1,
          title: '',
          description: '',
          meals: '',
          accommodation: '',
          destinationId: '',
        },
      ],
    }));
  }

  function removeDay(index: number) {
    setForm((f) => ({
      ...f,
      days: f.days
        .filter((_, i) => i !== index)
        .map((d, i) => ({ ...d, dayNumber: i + 1 })),
    }));
  }

  // Pricing Tiers Handlers
  function addPricingTier(preset?: { name: string; persons: number }) {
    setForm((f) => ({
      ...f,
      pricing: [
        ...f.pricing,
        {
          name: preset?.name || 'Standard Package',
          persons: preset?.persons || 1,
          price: f.basePrice || '1000',
          currency: f.currency || 'USD',
          discountPercent: '',
          discountPrice: '',
          isCustom: false,
          note: '',
        },
      ],
    }));
  }

  function updatePricingTier(index: number, patch: Partial<TourPricingItem>) {
    setForm((f) => {
      const pricing = f.pricing.map((p, i) => {
        if (i !== index) return p;
        const updated = { ...p, ...patch };

        // Handle auto discount math
        if ('discountPercent' in patch) {
          const numPrice = Number(updated.price) || 0;
          const pct = Number(patch.discountPercent) || 0;
          if (pct > 0 && numPrice > 0) {
            updated.discountPrice = (numPrice * (1 - pct / 100)).toFixed(2);
          } else if (patch.discountPercent === '') {
            updated.discountPrice = '';
          }
        } else if ('discountPrice' in patch) {
          const numPrice = Number(updated.price) || 0;
          const disc = Number(patch.discountPrice) || 0;
          if (disc > 0 && numPrice > 0 && disc < numPrice) {
            updated.discountPercent = (((numPrice - disc) / numPrice) * 100).toFixed(1);
          } else if (patch.discountPrice === '') {
            updated.discountPercent = '';
          }
        }

        return updated;
      });
      return { ...f, pricing };
    });
  }

  function removePricingTier(index: number) {
    setForm((f) => ({
      ...f,
      pricing: f.pricing.filter((_, i) => i !== index),
    }));
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

    if (form.destinationIds.length === 0) {
      setFormError('Every tour must be linked to at least one Destination. Please select a destination below.');
      setSubmitting(false);
      return;
    }

    const body = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      summary: form.summary.trim() || undefined,
      description: form.description.trim() || undefined,
      type: form.type || undefined,
      difficulty: form.difficulty || undefined,
      durationDays: form.durationDays ? Number(form.durationDays) : undefined,
      minPax: form.minPax ? Number(form.minPax) : undefined,
      maxPax: form.maxPax ? Number(form.maxPax) : undefined,
      basePrice: form.basePrice ? Number(form.basePrice) : undefined,
      currency: form.currency || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      availabilityNote: form.availabilityNote.trim() || undefined,
      coverImage: form.coverImage.trim() || undefined,
      images: form.images.filter(Boolean),
      videoUrl: form.videoUrl.trim() || undefined,
      status: form.status,
      destinationIds: form.destinationIds,
      inclusions: form.inclusions.split(',').map((s) => s.trim()).filter(Boolean),
      exclusions: form.exclusions.split(',').map((s) => s.trim()).filter(Boolean),
      highlights: form.highlights.split(',').map((s) => s.trim()).filter(Boolean),
      pricing: form.pricing.map((p) => ({
        name: p.name.trim(),
        persons: Number(p.persons) || 1,
        price: Number(p.price) || 0,
        currency: p.currency || form.currency || 'USD',
        discountPercent: p.discountPercent !== '' && p.discountPercent != null ? Number(p.discountPercent) : undefined,
        discountPrice: p.discountPrice !== '' && p.discountPrice != null ? Number(p.discountPrice) : undefined,
        isCustom: Boolean(p.isCustom),
        note: p.note?.trim() || undefined,
      })),
      days: form.days.map((d) => ({
        dayNumber: d.dayNumber,
        title: d.title || undefined,
        description: d.description || undefined,
        meals: (typeof d.meals === 'string' ? d.meals : (d.meals ?? []).join(', '))
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((s) => s.length > 0),
        accommodation: d.accommodation || undefined,
        destinationId: d.destinationId || undefined,
      })),
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
      setFormError(err instanceof Error ? err.message : 'Failed to save tour');
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

  function addImage(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    setForm((f) => ({ ...f, images: [...f.images, trimmed] }));
  }

  function removeImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  function moveImage(index: number, dir: -1 | 1) {
    setForm((f) => {
      const images = [...f.images];
      const target = index + dir;
      if (target < 0 || target >= images.length) return f;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...f, images };
    });
  }

  function setCoverFromImage(index: number) {
    setForm((f) => ({ ...f, coverImage: f.images[index] }));
  }

  function isCover(url: string) {
    return !!url && !!form.coverImage && url === form.coverImage;
  }

  async function publishTour(t: TourItem) {
    if (!window.confirm(`Publish "${t.name}"? It will become live on the public website.`)) return;
    try {
      await api.post(`/tours/${t.id}/publish`);
      await load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to publish tour');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        title="Tours & Packages"
        subtitle={editing ? `Editing: ${editing.name}` : 'Manage tour packages, multiple pricing tiers, dates & itineraries'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <Button variant="secondary" onClick={reset}>
                Cancel Edit
              </Button>
            ) : null}
            <Button
              variant="primary"
              onClick={() => {
                reset();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              + Create New Tour
            </Button>
          </div>
        }
      />

      <Card title={editing ? `Edit Tour: ${editing.name}` : 'New Tour Package'}>
        {formError && <ErrorState message={formError} />}

        <form onSubmit={submit} style={{ display: 'grid', gap: '20px' }}>
          {/* General Information */}
          <div className="form-grid">
            <Input label="Tour Name *" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. December in Ghana 12 Days" />
            <Input label="Slug (URL)" name="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. december-in-ghana-12-days" />
            <Select label="Tour Category / Type" name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={TOUR_TYPES.map((t) => ({ value: t, label: t }))} />
            <Input label="Difficulty Level" name="difficulty" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} placeholder="e.g. EASY, MODERATE, CHALLENGING" />
            <Input label="Duration (Days) *" name="durationDays" type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder="12" />
            <Input label="Min Guests (Pax)" name="minPax" type="number" value={form.minPax} onChange={(e) => setForm({ ...form, minPax: e.target.value })} />
            <Input label="Max Group Size" name="maxPax" type="number" value={form.maxPax} onChange={(e) => setForm({ ...form, maxPax: e.target.value })} />
            <Input label="Base Price ($/₵)" name="basePrice" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="3160" />
            <Select label="Primary Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={CURRENCIES} />
            <Select label="Publishing Status" name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </div>

          {/* Destination Linkage (REQUIRED) */}
          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: form.destinationIds.length === 0 ? '1px solid #f87171' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: form.destinationIds.length === 0 ? '#dc2626' : '#0f172a' }}>
                Linked Destinations * ({form.destinationIds.length} Selected)
              </span>
              <Link href="/crm/destinations" style={{ fontSize: '12px', color: '#008744', fontWeight: '700', textDecoration: 'none' }}>
                + Manage Destinations ↗
              </Link>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
              Every tour must be linked to at least one destination for filtering, routing, and booking attribution.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {destinations.map((d) => {
                const active = form.destinationIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    style={{
                      background: active ? '#008744' : '#fff',
                      color: active ? '#fff' : '#334155',
                      border: active ? '1px solid #008744' : '1px solid #cbd5e1',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: active ? '700' : '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => toggleDestination(d.id)}
                  >
                    <span>{active ? '✓' : '📍'}</span>
                    <span>{d.name}</span>
                    {d.country && <span style={{ opacity: 0.75, fontSize: '11px' }}>({d.country})</span>}
                  </button>
                );
              })}
              {destinations.length === 0 && (
                <div style={{ color: '#dc2626', fontSize: '13px' }}>
                  No destinations found! Please create a destination first in the Destinations manager.
                </div>
              )}
            </div>
          </div>

          {/* Tour Timing & Availability Dates */}
          <div style={{ background: '#f0fdf4', padding: '18px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#166534', marginBottom: '4px' }}>
              ⏳ Tour Timing &amp; Availability Window
            </div>
            <p style={{ fontSize: '13px', color: '#15803d', margin: '0 0 14px' }}>
              Define when this tour is available (from start date to end date) or provide a seasonal schedule note.
            </p>
            <div className="form-grid">
              <Input
                label="Start / Departure Date (From)"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <Input
                label="End / Return Date (To)"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
              <Input
                label="Availability / Schedule Note"
                name="availabilityNote"
                value={form.availabilityNote}
                onChange={(e) => setForm({ ...form, availabilityNote: e.target.value })}
                placeholder="e.g. 23rd Dec 2026 - 3rd Jan 2027 or 'Every Friday year-round'"
              />
            </div>
          </div>

          {/* Multiple & Custom Pricing Tiers with Discounts */}
          <div style={{ background: '#fffbeb', padding: '18px', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#92400e' }}>
                  🏷️ Multiple Pricing Packages, Custom Rates &amp; Discounts ({form.pricing.length})
                </div>
                <p style={{ fontSize: '13px', color: '#b45309', margin: '2px 0 0' }}>
                  Add multiple pricing options such as Double Occupancy, Single Occupancy, VIP Packages, or group custom pricing with promo rates.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => addPricingTier({ name: 'Double Occupancy', persons: 2 })}>
                  + Double Occupancy
                </Button>
                <Button variant="secondary" onClick={() => addPricingTier({ name: 'Single Occupancy', persons: 1 })}>
                  + Single Occupancy
                </Button>
                <Button variant="secondary" onClick={() => addPricingTier()}>
                  + Custom Tier
                </Button>
              </div>
            </div>

            {form.pricing.length === 0 ? (
              <div style={{ background: '#fff', padding: '16px', borderRadius: '6px', border: '1px dashed #d97706', textAlign: 'center', color: '#92400e', fontSize: '13px', marginTop: '12px' }}>
                No pricing tiers defined yet. Click any button above to add Double/Single occupancy or custom rate tiers.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {form.pricing.map((tier, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: '1px solid #fde68a',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>Tier #{idx + 1}</span>
                      <Button variant="danger" onClick={() => removePricingTier(idx)}>
                        Remove
                      </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <Input
                        label="Package Name *"
                        name={`pricing-name-${idx}`}
                        value={tier.name}
                        placeholder="e.g. Double Occupancy, Single Occupancy, VIP"
                        onChange={(e) => updatePricingTier(idx, { name: e.target.value })}
                        required
                      />
                      <Input
                        label="Persons (Pax)"
                        name={`pricing-persons-${idx}`}
                        type="number"
                        value={tier.persons}
                        placeholder="1"
                        onChange={(e) => updatePricingTier(idx, { persons: e.target.value })}
                      />
                      <Input
                        label="Regular Price *"
                        name={`pricing-price-${idx}`}
                        type="number"
                        value={tier.price}
                        placeholder="3160"
                        onChange={(e) => updatePricingTier(idx, { price: e.target.value })}
                        required
                      />
                      <Select
                        label="Currency"
                        name={`pricing-currency-${idx}`}
                        value={tier.currency}
                        options={CURRENCIES}
                        onChange={(e) => updatePricingTier(idx, { currency: e.target.value })}
                      />
                      <Input
                        label="Discount % (Optional)"
                        name={`pricing-disc-pct-${idx}`}
                        type="number"
                        value={tier.discountPercent}
                        placeholder="e.g. 10%"
                        onChange={(e) => updatePricingTier(idx, { discountPercent: e.target.value })}
                      />
                      <Input
                        label="Discounted Promo Price ($)"
                        name={`pricing-disc-price-${idx}`}
                        type="number"
                        value={tier.discountPrice}
                        placeholder="e.g. 2844"
                        onChange={(e) => updatePricingTier(idx, { discountPrice: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginTop: '10px', alignItems: 'center' }}>
                      <Input
                        label="Package Note / Description"
                        name={`pricing-note-${idx}`}
                        value={tier.note || ''}
                        placeholder="e.g. Per Person sharing a room or includes flight tickets"
                        onChange={(e) => updatePricingTier(idx, { note: e.target.value })}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '18px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(tier.isCustom)}
                          onChange={(e) => updatePricingTier(idx, { isCustom: e.target.checked })}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Custom Pricing</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media: Cover image and Gallery */}
          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '8px' }}>
              📸 Tour Photos &amp; Video Media
            </div>
            <div className="form-grid">
              <Input
                label="Cover Image URL"
                name="coverImage"
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                placeholder="https://.../cover.jpg"
              />
              <Input
                label="Video URL (YouTube/Vimeo)"
                name="videoUrl"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <span className="field-label">Additional Photo Gallery ({form.images.length})</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  id="gallery-url-input"
                  className="input"
                  placeholder="Paste image URL and click Add"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImage((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('gallery-url-input') as HTMLInputElement | null;
                    if (input) {
                      addImage(input.value);
                      input.value = '';
                    }
                  }}
                >
                  + Add Image
                </Button>
              </div>

              {form.images.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                  {form.images.map((img, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative',
                        width: '120px',
                        height: '80px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: isCover(img) ? '2px solid #008744' : '1px solid #cbd5e1',
                      }}
                    >
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          display: 'flex',
                          gap: '2px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setCoverFromImage(i)}
                          title="Set as Cover"
                          style={{ background: '#008744', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', padding: '2px 4px', cursor: 'pointer' }}
                        >
                          ★
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          title="Remove"
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', padding: '2px 4px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Descriptions & Inclusions */}
          <div className="form-grid">
            <Textarea label="Summary (Short overview)" name="summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <Textarea label="Full Description" name="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Textarea label="Inclusions (comma separated)" name="inclusions" rows={2} value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} />
            <Textarea label="Exclusions (comma separated)" name="exclusions" rows={2} value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} />
            <Textarea label="Highlights (comma separated)" name="highlights" rows={2} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} />
          </div>

          {/* Itinerary By Day */}
          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Day-by-Day Itinerary ({form.days.length} Days)</span>
              <Button variant="secondary" onClick={addDay}>
                + Add Day
              </Button>
            </div>

            {form.days.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '13px' }}>No day itinerary items yet. Click &quot;+ Add Day&quot; to build the daily schedule.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {form.days.map((day, i) => (
                  <div key={day.id ?? i} style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: '800', fontSize: '13px', color: '#008744' }}>Day {i + 1}</span>
                      <Button variant="danger" onClick={() => removeDay(i)}>
                        Remove Day
                      </Button>
                    </div>
                    <div className="form-grid">
                      <Input
                        label="Day Title"
                        name="dayTitle"
                        value={day.title ?? ''}
                        placeholder="e.g. Arrival in Accra & Welcome Banquet"
                        onChange={(e) => updateDay(i, { title: e.target.value })}
                      />
                      <Select
                        label="Destination Landmark"
                        name="dayDestination"
                        value={day.destinationId ?? ''}
                        onChange={(e) => updateDay(i, { destinationId: e.target.value })}
                        options={[
                          { value: '', label: 'Select Destination' },
                          ...destinations.map((d) => ({ value: d.id, label: `${d.name} (${d.country || 'Ghana'})` })),
                        ]}
                      />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Textarea
                        label="Activities & Schedule"
                        name="dayDescription"
                        rows={2}
                        value={day.description ?? ''}
                        onChange={(e) => updateDay(i, { description: e.target.value })}
                      />
                    </div>
                    <div className="form-grid" style={{ marginTop: 10 }}>
                      <Input
                        label="Meals Included"
                        name="dayMeals"
                        value={typeof day.meals === 'string' ? day.meals : (day.meals ?? []).join(', ')}
                        placeholder="e.g. Breakfast, Lunch, Welcome Dinner"
                        onChange={(e) => updateDay(i, { meals: e.target.value })}
                      />
                      <Input
                        label="Accommodation"
                        name="dayAccommodation"
                        value={day.accommodation ?? ''}
                        placeholder="e.g. Labadi Beach Hotel 5*"
                        onChange={(e) => updateDay(i, { accommodation: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving Tour...' : editing ? 'Update Tour Package' : 'Publish New Tour'}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Tours List Table */}
      {error && <ErrorState message={error} />}
      {data ? (
        <Card
          title="All Tour Packages"
          action={
            <input
              type="search"
              placeholder="Search tours..."
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
          }
        >
          <Table<TourItem>
            keyOf={(t) => t.id}
            rows={data.items}
            columns={[
              {
                key: 'cover',
                label: 'Cover',
                render: (t) =>
                  t.coverImage ? (
                    <img src={t.coverImage} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  ),
              },
              {
                key: 'name',
                label: 'Tour Name',
                render: (t) => (
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{t.name}</div>
                    {t.availabilityNote && (
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                        ⏳ {t.availabilityNote}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'destinations',
                label: 'Destinations',
                render: (t) =>
                  t.destinations && t.destinations.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {t.destinations.map((d) => (
                        <span
                          key={d.destination.id}
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}
                        >
                          📍 {d.destination.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: '600' }}>⚠ No Destination</span>
                  ),
              },
              {
                key: 'pricing',
                label: 'Pricing Tiers',
                render: (t) => {
                  if (t.pricing && t.pricing.length > 0) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {t.pricing.map((p, idx) => (
                          <div key={idx} style={{ fontSize: '12px', color: '#334155' }}>
                            <strong>{p.name}:</strong> {p.currency} {p.discountPrice || p.price}
                            {p.discountPercent ? <span style={{ color: '#ea580c', fontWeight: 'bold' }}> ({p.discountPercent}% off)</span> : ''}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <span style={{ fontWeight: '700', color: '#f97316' }}>
                      {t.basePrice != null ? `${t.currency ?? '$'} ${t.basePrice}` : 'Custom Quote'}
                    </span>
                  );
                },
              },
              { key: 'durationDays', label: 'Days', render: (t) => (t.durationDays ? `${t.durationDays}d` : '—') },
              {
                key: 'status',
                label: 'Status',
                render: (t) => (
                  <Badge>
                    <span style={{ color: t.status === 'ACTIVE' ? '#16a34a' : '#64748b', fontWeight: 'bold' }}>
                      {t.status === 'ACTIVE' ? '● Live' : t.status}
                    </span>
                  </Badge>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (t) => (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button variant="secondary" onClick={() => loadIntoForm(t)}>
                      Edit
                    </Button>
                    {t.status !== 'ACTIVE' && (
                      <Button variant="primary" onClick={() => publishTour(t)}>
                        Publish
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => remove(t)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </Card>
      ) : (
        <Spinner />
      )}
    </div>
  );
}
