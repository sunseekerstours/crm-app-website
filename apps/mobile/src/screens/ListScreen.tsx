import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Badge, Empty, ErrorText, Screen, Spinner } from '../components/ui';
import { colors, radius, spacing } from '../theme';

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
  onRowPress,
  addAction,
}: {
  title: string;
  endpoint: string;
  columns: Column<T>[];
  badgeKey?: keyof T;
  onBack?: () => void;
  onRowPress?: (item: T) => void;
  addAction?: { label: string; enabled: boolean; onPress: () => void };
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

  return (
    <Screen>
      <AppHeader
        title={title}
        onBack={onBack}
        right={!!addAction && addAction.enabled}
        rightLabel={addAction?.label ?? '+'}
        onRight={addAction ? addAction.onPress : undefined}
      />
      {error ? <ErrorText text={error} /> : null}
      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty text="No records found." />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={onRowPress ? () => onRowPress(item) : undefined}
              disabled={!onRowPress}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{columns[0].render(item)}</Text>
                {columns[1] ? (
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {columns[1].render(item)}
                  </Text>
                ) : null}
                {badgeKey && item[badgeKey] ? (
                  <View style={{ marginTop: 4 }}>
                    <Badge label={String(item[badgeKey])} />
                  </View>
                ) : null}
              </View>
              {onRowPress ? <Text style={styles.chevron}>›</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  row: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: spacing.sm },
});
