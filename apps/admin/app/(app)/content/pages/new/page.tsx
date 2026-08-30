'use client';

import { PageHeader } from '@/components/ui';
import { PageForm } from '@/components/page-form';

export default function NewPagePage() {
  return (
    <>
      <PageHeader title="New Site Page" subtitle="Create content for the public website" />
      <PageForm mode="create" />
    </>
  );
}
