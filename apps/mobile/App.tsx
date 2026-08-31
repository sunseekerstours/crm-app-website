import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Login from './src/screens/Login';
import { HomeScreen } from './src/screens/Home';
import ListScreen from './src/screens/ListScreen';
import NotificationsScreen from './src/screens/Notifications';
import CustomerDetailScreen from './src/screens/CustomerDetail';
import CustomerFormScreen from './src/screens/CustomerForm';
import LeadFormScreen from './src/screens/LeadForm';
import DealFormScreen from './src/screens/DealForm';
import TourFormScreen from './src/screens/TourForm';
import ProductScreen from './src/screens/ProductScreen';
import { resourceConfig } from './src/columns';
import { useAuth, hasPermission } from './src/useAuth';
import { colors } from './src/theme';
import type { Route } from './src/navigation';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [route, setRoute] = useState<Route>({ name: 'home' });

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

  const goHome = () => setRoute({ name: 'home' });

  let content: React.ReactNode;

  switch (route.name) {
    case 'notifications':
      content = <NotificationsScreen onBack={goHome} />;
      break;

    case 'customerDetail': {
      content = (
        <CustomerDetailScreen
          customerId={route.id}
          onBack={() => setRoute({ name: 'list', resource: 'customers' })}
          onEdit={(id) => setRoute({ name: 'customerForm', customerId: id })}
        />
      );
      break;
    }

    case 'customerForm': {
      content = (
        <CustomerFormScreen
          customerId={route.customerId}
          onBack={() => (route.customerId ? setRoute({ name: 'customerDetail', id: route.customerId }) : setRoute({ name: 'list', resource: 'customers' }))}
          onDone={() => (route.customerId ? setRoute({ name: 'customerDetail', id: route.customerId }) : setRoute({ name: 'list', resource: 'customers' }))}
          hasPerm={(p) => hasPermission(user, p)}
        />
      );
      break;
    }

    case 'productList': {
      content = <ProductScreen onBack={goHome} hasPerm={(p) => hasPermission(user, p)} />;
      break;
    }

    case 'list': {
      const cfg = resourceConfig(route.resource);
      if (cfg) {
        const addAction =
          cfg.addPermission && cfg.addLabel
            ? {
                label: cfg.addLabel,
                enabled: hasPermission(user, cfg.addPermission),
                onPress: () => setRoute(cfg.addRoute ?? { name: 'customerForm' }),
              }
            : undefined;
        content = (
          <ListScreen
            key={cfg.endpoint}
            title={cfg.title}
            endpoint={cfg.endpoint}
            columns={cfg.columns}
            badgeKey={cfg.badgeKey}
            onBack={goHome}
            onRowPress={
              cfg.detailRoute || cfg.editRoute
                ? (item) => setRoute(cfg.detailRoute ? cfg.detailRoute(item.id) : cfg.editRoute!(item.id))
                : undefined
            }
            addAction={addAction}
          />
        );
      } else {
        content = <HomeScreen user={user} onOpen={setRoute} onLogout={logout} />;
      }
      break;
    }

    case 'leadForm': {
      content = (
        <LeadFormScreen
          leadId={route.leadId}
          onBack={() => (route.leadId ? setRoute({ name: 'list', resource: 'leads' }) : setRoute({ name: 'list', resource: 'leads' }))}
          onDone={() => setRoute({ name: 'list', resource: 'leads' })}
          hasPerm={(p) => hasPermission(user, p)}
        />
      );
      break;
    }

    case 'dealForm': {
      content = (
        <DealFormScreen
          dealId={route.dealId}
          onBack={() => setRoute({ name: 'list', resource: 'deals' })}
          onDone={() => setRoute({ name: 'list', resource: 'deals' })}
          hasPerm={(p) => hasPermission(user, p)}
        />
      );
      break;
    }

    case 'tourForm': {
      content = (
        <TourFormScreen
          tourId={route.tourId}
          onBack={() => setRoute({ name: 'list', resource: 'tours' })}
          onDone={() => setRoute({ name: 'list', resource: 'tours' })}
          hasPerm={(p) => hasPermission(user, p)}
        />
      );
      break;
    }

    default:
      content = <HomeScreen user={user} onOpen={setRoute} onLogout={logout} />;
  }

  return (
    <>
      {content}
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 10, color: colors.muted },
});
