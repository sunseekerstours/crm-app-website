'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FleetRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/crm/fleet');
  }, [router]);
  return <div style={{ padding: '24px', color: '#94a3b8' }}>Redirecting to Fleet Management…</div>;
}
