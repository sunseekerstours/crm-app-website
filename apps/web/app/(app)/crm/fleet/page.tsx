'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WebCrmFleetRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/fleet');
  }, [router]);
  return <div style={{ padding: '24px', color: '#94a3b8' }}>Redirecting to Fleet Management…</div>;
}
