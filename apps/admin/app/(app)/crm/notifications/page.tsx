'use client';

import { useState } from 'react';
import { Button, Card, PageHeader, EmptyState, Spinner, ErrorState, Pagination } from '@/components/ui';
import { useList } from '@/lib/use-list';
import { api } from '@/lib/api';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  SYSTEM: 'System',
  DEPARTURE_REMINDER: 'Departure',
  PAYMENT_REMINDER: 'Payment',
  INVOICE_OVERDUE: 'Overdue invoice',
  LEAD_FOLLOW_UP: 'Lead follow-up',
  CHECKLIST_TODO: 'Checklist',
};

export default function NotificationsPage() {
  const { data, loading, error, reload, page, setPage } = useList<NotificationItem>(
    (p) => `/notifications?page=${p}&limit=10`,
  );
  const [busy, setBusy] = useState(false);

  async function markAllRead() {
    setBusy(true);
    try {
      await api.post('/notifications/read-all');
      reload();
      setPage(1);
    } catch {
      /* surface via reload */
    } finally {
      setBusy(false);
    }
  }

  const unread = (data?.items ?? []).filter((n) => !n.readAt).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Reminders and system alerts from automation"
        action={
          <Button variant="secondary" onClick={markAllRead} disabled={busy || unread === 0}>
            Mark all read
          </Button>
        }
      />
      <Card title={`Inbox${unread ? ` · ${unread} unread` : ''}`}>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState message="No notifications yet." />
        ) : (
          <>
            <ul className="notification-list">
              {(data?.items ?? []).map((n) => (
                <li key={n.id} className={`notification-item${n.readAt ? '' : ' unread'}`}>
                  <div className="notification-head">
                    <span className="badge">{TYPE_LABEL[n.type] ?? n.type}</span>
                    <span className="notification-title">{n.title}</span>
                    <span className="notification-date">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="notification-message">{n.message}</p>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
