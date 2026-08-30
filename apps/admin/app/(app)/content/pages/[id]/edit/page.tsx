'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, Spinner } from '@/components/ui';
import { PageForm } from '@/components/page-form';

interface PageData {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: Record<string, unknown>;
  metaTitle?: string;
  metaDescription?: string;
  status: string;
}

export default function EditPagePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PageData>(`/pages/${id}`)
      .then(setPage)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load page'));
  }, [id]);

  if (error) return <div className="error-state">Error: {error}</div>;
  if (!page) return <Spinner />;

  return (
    <>
      <PageHeader title="Edit Site Page" subtitle={page.title} />
      <PageForm
        mode="edit"
        id={id}
        initial={{
          title: page.title,
          slug: page.slug,
          excerpt: page.excerpt,
          body: page.body,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          status: page.status,
        }}
      />
    </>
  );
}
