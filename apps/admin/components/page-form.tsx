'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Input, Select, Textarea } from '@/components/ui';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface PageFormProps {
  mode: 'create' | 'edit';
  initial?: {
    title: string;
    slug: string;
    excerpt?: string;
    body?: Record<string, unknown>;
    metaTitle?: string;
    metaDescription?: string;
    status: string;
  };
  id?: string;
}

export function PageForm({ mode, initial, id }: PageFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [bodyText, setBodyText] = useState(
    typeof initial?.body?.html === 'string' ? initial.body.html : '',
  );
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'DRAFT');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title,
      slug: slug || undefined,
      excerpt: excerpt || undefined,
      body: bodyText ? { html: bodyText } : {},
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      status,
    };
    try {
      if (mode === 'create') {
        await api.post('/pages', payload);
      } else {
        await api.patch(`/pages/${id}`, payload);
      }
      router.push('/content/pages');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save page');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error ? <div className="auth-error">{error}</div> : null}
        <Input label="Title" name="title" value={title} required onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Slug (leave blank to auto-generate from title)"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Textarea label="Excerpt / summary" name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <Textarea
          label="Body (HTML)"
          name="body"
          value={bodyText}
          rows={16}
          onChange={(e) => setBodyText(e.target.value)}
        />
        <Input label="Meta title (SEO)" name="metaTitle" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
        <Input
          label="Meta description (SEO)"
          name="metaDescription"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
        />
        <Select label="Status" name="status" value={status} options={STATUS_OPTIONS} onChange={(e) => setStatus(e.target.value)} />
        <div className="form-actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create page' : 'Save changes'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/content/pages')}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
