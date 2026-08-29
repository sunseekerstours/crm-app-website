import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Login from './src/screens/Login';
import { HomeScreen } from './src/screens/Home';
import ListScreen from './src/screens/ListScreen';
import NotificationsScreen from './src/screens/Notifications';
import { resourceConfig } from './src/columns';
import { useAuth } from './src/useAuth';
import { colors } from './src/theme';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [screen, setScreen] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={async (e, p) => { await login(e, p); }} />
        <StatusBar style="auto" />
      </>
    );
  }

  const cfg = screen ? resourceConfig(screen) : null;

  return (
    <>
      {screen === 'notifications' ? (
        <NotificationsScreen onBack={() => setScreen(null)} />
      ) : cfg ? (
        <ListScreen
          key={screen!}
          title={cfg.title}
          endpoint={cfg.endpoint}
          columns={cfg.columns}
          badgeKey={cfg.badgeKey}
          onBack={() => setScreen(null)}
        />
      ) : (
        <HomeScreen onOpen={setScreen} onLogout={logout} />
      )}
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 10, color: colors.muted },
});
