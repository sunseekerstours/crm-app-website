import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api, getApiUrl } from '../api';
import { Badge, Screen, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => string;
}

export default function ListScreen<T extends { id: string }>({
  title,
  endpoint,
  columns,
  badgeKey,
  onBack,
}: {
  title: string;
  endpoint: string;
  columns: Column<T>[];
  badgeKey?: keyof T;
  onBack?: () => void;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await api.get<{ items: T[] }>(endpoint);
      setRows(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) return <Screen><Spinner /></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack ? <TouchableOpacity onPress={onBack}><Text style={styles.link}>‹ Back</Text></TouchableOpacity> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}><Text style={styles.link}>Refresh</Text></TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={<Text style={styles.empty}>No records found.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{columns[0].render(item)}</Text>
              {badgeKey ? (
                <View style={{ marginTop: 4 }}><Badge label={String(item[badgeKey])} /></View>
              ) : null}
            </View>
            <Text style={styles.rowId}>{String(item.id).slice(0, 8)}</Text>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  row: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowId: { color: colors.muted, fontSize: 12 },
});
