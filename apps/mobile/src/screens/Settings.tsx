import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Card } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type { User } from '../useAuth';

export default function SettingsScreen({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const insets = useSafeAreaInsets();
  const displayName = user.name || user.email || 'Staff';
  const role = (Array.isArray(user.roles) && user.roles[0]) || 'Member';
  const allRoles = Array.isArray(user.roles) ? user.roles : [];
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  const permGroups: Record<string, string[]> = {};
  permissions.forEach((p) => {
    const [group] = p.split('.');
    if (!permGroups[group]) permGroups[group] = [];
    permGroups[group].push(p);
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={[styles.headerSection, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Card title="Roles">
        <View style={styles.chipRow}>
          {allRoles.map((r) => (
            <View key={r} style={styles.chip}>
              <Text style={styles.chipText}>{r}</Text>
            </View>
          ))}
          {allRoles.length === 0 && <Text style={styles.muted}>No roles assigned</Text>}
        </View>
      </Card>

      <Card title={`Permissions (${permissions.length})`}>
        {Object.entries(permGroups).map(([group, perms]) => (
          <View key={group} style={styles.permGroup}>
            <Text style={styles.permGroupTitle}>{group.toUpperCase()}</Text>
            <View style={styles.chipRow}>
              {perms.map((p) => (
                <View key={p} style={styles.permChip}>
                  <Text style={styles.permChipText}>{p.split('.')[1]}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        {permissions.length === 0 && <Text style={styles.muted}>Full access (SUPER_ADMIN)</Text>}
      </Card>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  headerSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: '#ffffff', fontSize: 26, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  permGroup: { marginBottom: spacing.md },
  permGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  permChip: {
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permChipText: { fontSize: 11, color: colors.text, fontWeight: '500', textTransform: 'capitalize' },
  muted: { color: colors.muted, fontSize: 13 },
  logoutBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
