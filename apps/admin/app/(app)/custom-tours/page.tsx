'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCustomToursRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/crm/custom-tours');
  }, [router]);
  return <div style={{ padding: '24px', color: '#94a3b8' }}>Redirecting to Customised Tours & Ops…</div>;
}
