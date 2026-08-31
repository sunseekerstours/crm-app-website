import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login from './src/screens/Login';
import DashboardScreen from './src/screens/Dashboard';
import { HomeScreen } from './src/screens/Home';
import SettingsScreen from './src/screens/Settings';
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
import { Drawer } from './src/components/Drawer';
import { AppHeader } from './src/components/ui';
import { resourceConfig } from './src/columns';
import { useAuth, hasPermission } from './src/useAuth';
import { colors } from './src/theme';
import type { Route } from './src/navigation';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const goBack = () => {
    if (route.name === 'dashboard') return;
    if (route.name === 'customerForm') {
      setRoute(route.customerId ? { name: 'customerDetail', id: route.customerId } : { name: 'list', resource: 'customers' });
      return;
    }
    const backMap: Record<string, Route> = {
      list: { name: 'dashboard' },
      customerDetail: { name: 'list', resource: 'customers' },
      leadForm: { name: 'list', resource: 'leads' },
      dealForm: { name: 'list', resource: 'deals' },
      tourForm: { name: 'list', resource: 'tours' },
      paymentForm: { name: 'list', resource: 'payments' },
      bookingForm: { name: 'list', resource: 'bookings' },
      departureForm: { name: 'list', resource: 'departures' },
      productList: { name: 'dashboard' },
      productForm: { name: 'dashboard' },
      notifications: { name: 'dashboard' },
      settings: { name: 'dashboard' },
      home: { name: 'dashboard' },
    };
    setRoute(backMap[route.name] ?? { name: 'dashboard' });
  };

  const isRoot = route.name === 'dashboard' || route.name === 'home';

  const headerTitle =
    route.name === 'dashboard'
      ? 'Sunseekers'
      : route.name === 'list'
        ? (resourceConfig(route.resource)?.title ?? route.resource)
        : route.name === 'settings'
          ? 'Settings'
          : route.name === 'notifications'
            ? 'Notifications'
            : route.name === 'customerDetail'
              ? 'Customer'
              : route.name === 'customerForm'
                ? route.customerId ? 'Edit Customer' : 'New Customer'
                : route.name === 'leadForm'
                  ? route.leadId ? 'Edit Lead' : 'New Lead'
                  : route.name === 'dealForm'
                    ? route.dealId ? 'Edit Deal' : 'New Deal'
                    : route.name === 'tourForm'
                      ? route.tourId ? 'Edit Tour' : 'New Tour'
                      : route.name === 'paymentForm'
                        ? 'Record Payment'
                        : route.name === 'bookingForm'
                          ? 'New Booking'
                          : route.name === 'departureForm'
                            ? 'New Departure'
                            : route.name === 'productList'
                              ? 'Products'
                              : '';

  let content: React.ReactNode;

  switch (route.name) {
    case 'dashboard':
      content = <DashboardScreen user={user} onNavigate={setRoute} />;
      break;

    case 'home':
      content = <HomeScreen user={user} onOpen={setRoute} onLogout={logout} />;
      break;

    case 'settings':
      content = <SettingsScreen user={user} onLogout={logout} />;
      break;

    case 'notifications':
      content = <NotificationsScreen onBack={goBack} />;
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
      content = <ProductScreen onBack={goBack} hasPerm={(p) => hasPermission(user, p)} />;
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
            onBack={goBack}
            onRowPress={
              cfg.detailRoute || cfg.editRoute
                ? (item) => setRoute(cfg.detailRoute ? cfg.detailRoute(item.id) : cfg.editRoute!(item.id))
                : undefined
            }
            addAction={addAction}
          />
        );
      } else {
        content = <DashboardScreen user={user} onNavigate={setRoute} />;
      }
      break;
    }

    case 'leadForm': {
      content = (
        <LeadFormScreen
          leadId={route.leadId}
          onBack={() => setRoute({ name: 'list', resource: 'leads' })}
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
      content = <DashboardScreen user={user} onNavigate={setRoute} />;
  }

  return (
    <SafeAreaProvider>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={setRoute}
        user={user}
        currentRoute={route}
      />
      <View style={styles.shell}>
        <AppHeader
          title={headerTitle}
          onMenu={isRoot ? () => setDrawerOpen(true) : undefined}
          onBack={!isRoot ? goBack : undefined}
        />
        <View style={styles.shellContent}>{content}</View>
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
