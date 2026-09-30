'use client';

import { AuthProvider } from '@/lib/auth';
import { NotificationsProvider } from '@/lib/notifications-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>{children}</NotificationsProvider>
    </AuthProvider>
  );
}
