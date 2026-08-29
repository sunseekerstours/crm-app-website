import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../components/ui';
import { colors, spacing } from '../theme';

export interface NavItem {
  key: string;
  label: string;
  subtitle: string;
}

const NAV: NavItem[] = [
  { key: 'customers', label: 'Customers', subtitle: 'Manage customer records' },
  { key: 'leads', label: 'Leads', subtitle: 'Track and follow up leads' },
  { key: 'deals', label: 'Deals', subtitle: 'Pipeline and opportunities' },
  { key: 'tours', label: 'Tours', subtitle: 'Tour catalog' },
  { key: 'departures', label: 'Departures', subtitle: 'Scheduled departures' },
  { key: 'bookings', label: 'Bookings', subtitle: 'Reservations' },
  { key: 'payments', label: 'Payments', subtitle: 'Payment records' },
  { key: 'notifications', label: 'Notifications', subtitle: 'Reminders and alerts' },
];

export function HomeScreen({ onOpen, onLogout }: { onOpen: (key: string) => void; onLogout: () => void }) {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Sunseekers CRM</Text>
        <TouchableOpacity onPress={onLogout}><Text style={styles.logout}>Sign out</Text></TouchableOpacity>
      </View>
      <Text style={styles.welcome}>Staff mobile workspace</Text>
      {NAV.map((item) => (
        <TouchableOpacity key={item.key} style={styles.tile} onPress={() => onOpen(item.key)}>
          <Text style={styles.tileLabel}>{item.label}</Text>
          <Text style={styles.tileSub}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary },
  logout: { color: colors.danger, fontWeight: '600' },
  welcome: { color: colors.muted, marginBottom: spacing.lg, marginTop: 2 },
  tile: {
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  tileLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  tileSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
