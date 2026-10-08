'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WebCrmQrCodesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/qr-codes');
  }, [router]);
  return <div style={{ padding: '24px', color: '#94a3b8' }}>Redirecting to QR Code Studio…</div>;
}
