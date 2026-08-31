import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme';
import type { Route } from '../navigation';
import type { User } from '../useAuth';

export interface DrawerItem {
  key: string;
  label: string;
  icon: string;
  permission: string;
  route: Route;
}

export const DRAWER_ITEMS: DrawerItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', permission: '', route: { name: 'dashboard' } },
  { key: 'customers', label: 'Customers', icon: '👥', permission: 'customers.view', route: { name: 'list', resource: 'customers' } },
  { key: 'leads', label: 'Leads', icon: '🎯', permission: 'leads.view', route: { name: 'list', resource: 'leads' } },
  { key: 'deals', label: 'Deals', icon: '💼', permission: 'deals.view', route: { name: 'list', resource: 'deals' } },
  { key: 'departures', label: 'Departures', icon: '✈️', permission: 'departures.view', route: { name: 'list', resource: 'departures' } },
  { key: 'bookings', label: 'Bookings', icon: '🧾', permission: 'bookings.view', route: { name: 'list', resource: 'bookings' } },
  { key: 'payments', label: 'Payments', icon: '💳', permission: 'payments.view', route: { name: 'list', resource: 'payments' } },
  { key: 'tours', label: 'Tours', icon: '🏝️', permission: 'tours.view', route: { name: 'list', resource: 'tours' } },
  { key: 'products', label: 'Products', icon: '📦', permission: 'products.view', route: { name: 'productList' } },
  { key: 'notifications', label: 'Notifications', icon: '🔔', permission: 'notifications.view', route: { name: 'notifications' } },
  { key: 'settings', label: 'Settings', icon: '⚙️', permission: '', route: { name: 'settings' } },
];

function can(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (!permission) return true;
  if (!Array.isArray(user.permissions) || user.permissions.length === 0) return true;
  return user.permissions.includes(permission);
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: Route) => void;
  user: User;
  currentRoute: Route;
}

export function Drawer({ open, onClose, onNavigate, user, currentRoute }: DrawerProps) {
  const insets = useSafeAreaInsets();
  const displayName = user.name || user.email || 'Staff';
  const role = (Array.isArray(user.roles) && user.roles[0]) || 'Member';

  if (!open) return null;

  const visibleItems = DRAWER_ITEMS.filter((item) => can(user, item.permission));

  return (
    <>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.drawer, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.drawerName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.navList}>
          {visibleItems.map((item) => {
            const isActive =
              item.route.name === currentRoute.name &&
              (item.route.name !== 'list' || item.route.resource === (currentRoute as { name: string; resource?: string }).resource);
            return (
              <Pressable
                key={item.key}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => {
                  onNavigate(item.route);
                  onClose();
                }}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.panel,
    zIndex: 101,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  navList: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  navIcon: {
    fontSize: 18,
    marginRight: spacing.md,
    width: 28,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  navLabelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});
