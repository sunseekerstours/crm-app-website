import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { Badge, Screen, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

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
  INVOICE_OVERDUE: 'Overdue',
  LEAD_FOLLOW_UP: 'Lead',
  CHECKLIST_TODO: 'Checklist',
};

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await api.get<{ items: NotificationItem[] }>('/notifications?page=1&limit=20');
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all');
      load();
    } catch {
      /* ignore */
    }
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}><Text style={styles.link}>Mark all read</Text></TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          ListHeaderComponent={unread ? <Text style={styles.unread}>{unread} unread</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.row, !item.readAt && styles.rowUnread]}>
              <View style={styles.rowHead}>
                <Badge label={TYPE_LABEL[item.type] ?? item.type} />
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMsg}>{item.message}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  back: { color: colors.primary, fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  link: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
  unread: { color: colors.primary, fontWeight: '600', marginBottom: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  row: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowUnread: { borderLeftWidth: 4, borderLeftColor: colors.primary, backgroundColor: colors.unread },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: colors.muted },
  rowTitle: { fontSize: 15, fontWeight: '600', marginTop: 6 },
  rowMsg: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
