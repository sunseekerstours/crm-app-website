import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login from './src/screens/Login';
import { HomeScreen } from './src/screens/Home';
import ListScreen from './src/screens/ListScreen';
import NotificationsScreen from './src/screens/Notifications';
import CustomerDetailScreen from './src/screens/CustomerDetail';
import CustomerFormScreen from './src/screens/CustomerForm';
import LeadFormScreen from './src/screens/LeadForm';
import DealFormScreen from './src/screens/DealForm';
import TourFormScreen from './src/screens/TourForm';
import PaymentFormScreen from './src/screens/PaymentForm';
import BookingFormScreen from './src/screens/BookingForm';
import DepartureFormScreen from './src/screens/DepartureForm';
import ProductScreen from './src/screens/ProductScreen';
import { resourceConfig } from './src/columns';
import { useAuth, hasPermission } from './src/useAuth';
import { TabBar } from './src/components/ui';
import { colors } from './src/theme';
import type { Route } from './src/navigation';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [route, setRoute] = useState<Route>({ name: 'home' });

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <Login onLogin={async (e, p) => { await login(e, p); }} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
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

    case 'paymentForm': {
      content = (
        <PaymentFormScreen
          onBack={() => setRoute({ name: 'list', resource: 'payments' })}
          onDone={() => setRoute({ name: 'list', resource: 'payments' })}
          hasPerm={(p) => hasPermission(user, p)}
        />
      );
      break;
    }

    case 'bookingForm': {
      content = (
        <BookingFormScreen
          onBack={() => setRoute({ name: 'list', resource: 'bookings' })}
          onDone={() => setRoute({ name: 'list', resource: 'bookings' })}
          hasPerm={(p) => hasPermission(user, p)}
        />
      );
      break;
    }

    case 'departureForm': {
      content = (
        <DepartureFormScreen
          onBack={() => setRoute({ name: 'list', resource: 'departures' })}
          onDone={() => setRoute({ name: 'list', resource: 'departures' })}
          hasPerm={(p) => hasPermission(user, p)}
        />
      );
      break;
    }

    default:
      content = <HomeScreen user={user} onOpen={setRoute} onLogout={logout} />;
  }

  const activeTab =
    route.name === 'home'
      ? 'home'
      : route.name === 'list' && route.resource === 'customers'
        ? 'customers'
        : route.name === 'list' && route.resource === 'leads'
          ? 'leads'
          : route.name === 'list' && route.resource === 'deals'
            ? 'deals'
            : '';

  const onTabSelect = (key: string) => {
    if (key === 'home') setRoute({ name: 'home' });
    else setRoute({ name: 'list', resource: key });
  };

  return (
    <SafeAreaProvider>
      <View style={styles.shell}>
        <View style={styles.shellContent}>{content}</View>
        <TabBar
          tabs={[
            { key: 'home', label: 'Home', icon: '🏠' },
            { key: 'customers', label: 'Customers', icon: '👥' },
            { key: 'leads', label: 'Leads', icon: '🎯' },
            { key: 'deals', label: 'Deals', icon: '💼' },
          ]}
          active={activeTab}
          onSelect={onTabSelect}
        />
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  shellContent: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 10, color: colors.muted },
});
