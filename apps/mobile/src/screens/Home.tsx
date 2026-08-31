import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type { Route } from '../navigation';
import type { User } from '../useAuth';

export interface NavItem {
  key: string;
  label: string;
  subtitle: string;
  permission: string;
  route: Route;
  icon: string;
}

const NAV: NavItem[] = [
  { key: 'customers', label: 'Customers', subtitle: 'Manage customer records', permission: 'customers.view', icon: '👥', route: { name: 'list', resource: 'customers' } },
  { key: 'leads', label: 'Leads', subtitle: 'Track and follow up leads', permission: 'leads.view', icon: '🎯', route: { name: 'list', resource: 'leads' } },
  { key: 'deals', label: 'Deals', subtitle: 'Pipeline and opportunities', permission: 'deals.view', icon: '💼', route: { name: 'list', resource: 'deals' } },
  { key: 'tours', label: 'Tours', subtitle: 'Tour catalog', permission: 'tours.view', icon: '🏝️', route: { name: 'list', resource: 'tours' } },
  { key: 'departures', label: 'Departures', subtitle: 'Scheduled departures', permission: 'departures.view', icon: '📅', route: { name: 'list', resource: 'departures' } },
  { key: 'bookings', label: 'Bookings', subtitle: 'Reservations', permission: 'bookings.view', icon: '🧾', route: { name: 'list', resource: 'bookings' } },
  { key: 'payments', label: 'Payments', subtitle: 'Payment records', permission: 'payments.view', icon: '💳', route: { name: 'list', resource: 'payments' } },
  { key: 'products', label: 'Products & Services', subtitle: 'Tours, flights, hotels', permission: 'products.view', icon: '📦', route: { name: 'productList' } },
  { key: 'notifications', label: 'Notifications', subtitle: 'Reminders and alerts', permission: 'notifications.view', icon: '🔔', route: { name: 'notifications' } },
];

function can(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (!Array.isArray(user.permissions) || user.permissions.length === 0) return true;
  return user.permissions.includes(permission);
}

export function HomeScreen({
  user,
  onOpen,
  onLogout,
}: {
  user: User;
  onOpen: (route: Route) => void;
  onLogout: () => void;
}) {
  const displayName = user.name || user.email || 'Staff';
  const role = (Array.isArray(user.roles) && user.roles[0]) || 'Member';

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>Sunseekers</Text>
        <Text style={styles.greeting}>Welcome back, {displayName}</Text>
        <View style={styles.roleRow}>
          <Text style={styles.role}>{role}</Text>
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.logout}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.gridLabel}>Your workspace</Text>
        <View style={styles.grid}>
          {NAV.map((item) => {
            const show = can(user, item.permission);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tile, !show && styles.tileDisabled]}
                onPress={() => show && onOpen(item.route)}
              >
                <Text style={styles.tileIcon}>{item.icon}</Text>
                <Text style={styles.tileLabel}>{item.label}</Text>
                <Text style={styles.tileSub} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.header,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  brand: { color: colors.headerText, fontSize: 22, fontWeight: '800', letterSpacing: 0.4 },
  greeting: { color: colors.primaryLight, marginTop: 4, fontSize: 14 },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  role: {
    color: colors.headerText,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  logout: { color: colors.headerText, fontWeight: '600', fontSize: 14 },
  body: { padding: spacing.lg },
  gridLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  tileDisabled: { opacity: 0.45 },
  tileIcon: { fontSize: 22 },
  tileLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 6 },
  tileSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
