import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { Spinner } from '../components/ui';
import { colors, radius, shadow, spacing } from '../theme';
import type { Route } from '../navigation';
import type { User } from '../useAuth';

interface StatItem {
  label: string;
  value: number;
  icon: string;
  color: string;
  route: Route;
  permission: string;
}

function can(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (!permission) return true;
  if (!Array.isArray(user.permissions) || user.permissions.length === 0) return true;
  return user.permissions.includes(permission);
}

export default function DashboardScreen({
  user,
  onNavigate,
}: {
  user: User;
  onNavigate: (route: Route) => void;
}) {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [customers, leads, deals, bookings, payments, departures] = await Promise.all([
        api.get<{ total?: number; items?: unknown[] }>('/customers?limit=1').catch(() => ({ total: 0 })),
        api.get<{ total?: number; items?: unknown[] }>('/leads?limit=1').catch(() => ({ total: 0 })),
        api.get<{ total?: number; items?: unknown[] }>('/deals?limit=1').catch(() => ({ total: 0 })),
        api.get<{ total?: number; items?: unknown[] }>('/bookings?limit=1').catch(() => ({ total: 0 })),
        api.get<{ total?: number; items?: unknown[] }>('/payments?limit=1').catch(() => ({ total: 0 })),
        api.get<{ total?: number; items?: unknown[] }>('/departures?limit=1').catch(() => ({ total: 0 })),
      ]);
      setStats([
        { label: 'Customers', value: customers.total ?? 0, icon: '👥', color: '#0E9F6E', route: { name: 'list', resource: 'customers' }, permission: 'customers.view' },
        { label: 'Leads', value: leads.total ?? 0, icon: '🎯', color: '#F59E0B', route: { name: 'list', resource: 'leads' }, permission: 'leads.view' },
        { label: 'Deals', value: deals.total ?? 0, icon: '💼', color: '#2563EB', route: { name: 'list', resource: 'deals' }, permission: 'deals.view' },
        { label: 'Departures', value: departures.total ?? 0, icon: '✈️', color: '#7C3AED', route: { name: 'list', resource: 'departures' }, permission: 'departures.view' },
        { label: 'Bookings', value: bookings.total ?? 0, icon: '🧾', color: '#0891B2', route: { name: 'list', resource: 'bookings' }, permission: 'bookings.view' },
        { label: 'Payments', value: payments.total ?? 0, icon: '💳', color: '#059669', route: { name: 'list', resource: 'payments' }, permission: 'payments.view' },
      ]);
    } catch {
      setStats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const visibleStats = stats.filter((s) => can(user, s.permission));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            <Text style={styles.sectionLabel}>Overview</Text>
            <View style={styles.statsGrid}>
              {visibleStats.map((stat) => (
                <TouchableOpacity
                  key={stat.label}
                  style={[styles.statCard, shadow.card]}
                  onPress={() => onNavigate(stat.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconWrap, { backgroundColor: stat.color + '18' }]}>
                    <Text style={styles.statIcon}>{stat.icon}</Text>
                  </View>
                  <Text style={styles.statValue}>{stat.value.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => onNavigate({ name: 'customerForm' })}
              >
                <Text style={styles.actionText}>+ New Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => onNavigate({ name: 'leadForm' })}
              >
                <Text style={styles.actionText}>+ New Lead</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2563EB' }]}
                onPress={() => onNavigate({ name: 'dealForm' })}
              >
                <Text style={styles.actionText}>+ New Deal</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted, fontWeight: '500', marginTop: 2 },
  actions: { gap: spacing.sm },
  actionBtn: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
