'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api } from './api';
import { playNotificationSound } from './sound';

interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type?: string;
  createdAt: string;
}

interface NotificationsContextValue {
  unreadCount: number;
  recentNotifications: any[];
  reload: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  triggerSoundTest: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  recentNotifications: [],
  reload: async () => {},
  markAsRead: async () => {},
  triggerSoundTest: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [activeToast, setActiveToast] = useState<NotificationToast | null>(null);
  const prevCountRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      const count = res?.count ?? 0;
      
      // If count increased and it's not the initial load, trigger chime & toast!
      if (prevCountRef.current !== null && count > prevCountRef.current) {
        playNotificationSound();
        try {
          const list = await api.get<{ items: any[] }>('/notifications?unreadOnly=true&limit=1');
          if (list?.items && list.items.length > 0) {
            const latest = list.items[0];
            setActiveToast({
              id: latest.id,
              title: latest.title,
              message: latest.message,
              type: latest.type,
              createdAt: latest.createdAt,
            });
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setActiveToast(null);
            }, 6000);
          }
        } catch {}
      }

      prevCountRef.current = count;
      setUnreadCount(count);

      if (typeof document !== 'undefined') {
        const titleWithoutCount = document.title.replace(/^\(\d+\)\s*/, '');
        document.title = count > 0 ? `(${count}) ${titleWithoutCount}` : titleWithoutCount;
      }
    } catch (e) {}
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      await fetchCount();
    } catch {}
  }, [fetchCount]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 25000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const triggerSoundTest = useCallback(() => {
    playNotificationSound();
    setActiveToast({
      id: 'test-' + Date.now(),
      title: 'Admin Notification Chime Test',
      message: 'Sound alert is active and notifications are showing live numbers!',
      type: 'SYSTEM',
      createdAt: new Date().toISOString(),
    });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 5000);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        reload: fetchCount,
        markAsRead,
        triggerSoundTest,
      }}
    >
      {children}

      {/* Floating Animated Popup Toast with Brand Aesthetics */}
      {activeToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            maxWidth: '380px',
            background: 'linear-gradient(135deg, #0f1f17 0%, #132b1f 100%)',
            border: '2px solid #16a34a',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(22, 163, 74, 0.4)',
            color: '#ffffff',
            padding: '16px 20px',
            animation: 'slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)',
              fontSize: '20px',
            }}
          >
            🔔
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#4ade80' }}>
                {activeToast.title}
              </div>
              <button
                onClick={() => setActiveToast(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '4px', lineHeight: 1.4 }}>
              {activeToast.message}
            </div>
            <div style={{ fontSize: '11px', color: '#86efac', marginTop: '6px', fontWeight: 600 }}>
              Sunseekers Admin Alert • Just now
            </div>
          </div>
        </div>
      )}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
