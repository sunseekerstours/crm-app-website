import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Button, Chip, Empty, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, radius, spacing } from '../theme';

interface ProductOption {
  id: string;
  name: string;
  category?: string | null;
}

interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  country?: string | null;
  nationality?: string | null;
  address?: string | null;
  leadSource?: string | null;
  status: string;
  products?: { id: string; name: string; category?: string | null }[];
}

const LEAD_SOURCES = ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'PHONE', 'EMAIL', 'REFERRAL', 'WALK_IN', 'GOOGLE', 'PARTNER', 'MANUAL', 'IMPORT', 'OTHER'];
const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

export default function CustomerFormScreen({
  customerId,
  onBack,
  onDone,
  hasPerm,
}: {
  customerId?: string;
  onBack: () => void;
  onDone: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [country, setCountry] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [prodData, custData] = await Promise.all([
        api.get<{ items: ProductOption[] }>('/products?limit=100').catch(() => ({ items: [] as ProductOption[] })),
        customerId ? api.get<CustomerDetail>(`/customers/${customerId}`) : Promise.resolve(null),
      ]);
      setProducts(prodData.items ?? []);
      if (custData) {
        setFirstName(custData.firstName ?? '');
        setLastName(custData.lastName ?? '');
        setEmail(custData.email ?? '');
        setPhone(custData.phone ?? '');
        setWhatsapp(custData.whatsapp ?? '');
        setCountry(custData.country ?? '');
        setNationality(custData.nationality ?? '');
        setAddress(custData.address ?? '');
        setLeadSource(custData.leadSource ?? '');
        setStatus(custData.status ?? 'ACTIVE');
        setSelectedProducts((custData.products ?? []).map((p) => p.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function submit() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'First and last name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      country: country.trim() || undefined,
      nationality: nationality.trim() || undefined,
      address: address.trim() || undefined,
      leadSource: leadSource || undefined,
      productIds: selectedProducts,
      ...(customerId ? { status } : {}),
    };
    try {
      if (customerId) {
        await api.patch(`/customers/${customerId}`, body);
      } else {
        await api.post('/customers', body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save customer');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title={customerId ? 'Edit Customer' : 'New Customer'} onBack={onBack} />
        <Spinner />
      </Screen>
    );
  }

  const canCreate = hasPerm('customers.create');
  const canUpdate = hasPerm('customers.update');
  const savingAllowed = customerId ? canUpdate : canCreate;

  return (
    <Screen>
      <AppHeader title={customerId ? 'Edit Customer' : 'New Customer'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error ? <ErrorText text={error} /> : null}
        <SectionLabel>Contact</SectionLabel>
        <Field label="First name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
        <Field label="Country" value={country} onChangeText={setCountry} />
        <Field label="Nationality" value={nationality} onChangeText={setNationality} />
        <Field label="Address" value={address} onChangeText={setAddress} multiline />

        <View style={styles.spacer} />
        <SectionLabel>Lead source</SectionLabel>
        <View style={styles.chipRow}>
          {LEAD_SOURCES.map((ls) => (
            <Chip key={ls} label={ls} selected={leadSource === ls} onPress={() => setLeadSource(ls === leadSource ? '' : ls)} />
          ))}
        </View>

        {customerId ? (
          <>
            <View style={styles.spacer} />
            <SectionLabel>Status</SectionLabel>
            <View style={styles.chipRow}>
              {CUSTOMER_STATUSES.map((st) => (
                <Chip key={st} label={st} selected={status === st} onPress={() => setStatus(st)} />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.spacer} />
        <SectionLabel>Products &amp; Services</SectionLabel>
        {products.length > 0 ? (
          <View style={styles.chipRow}>
            {products.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={selectedProducts.includes(p.id)}
                onPress={() => toggleProduct(p.id)}
              />
            ))}
          </View>
        ) : (
          <Empty text="No products yet. Add products from the Products menu first." />
        )}
        {selectedProducts.length > 0 ? (
          <Text style={styles.selectedCount}>{selectedProducts.length} selected</Text>
        ) : null}

        <View style={styles.spacer} />
        <Button
          title={customerId ? 'Save changes' : 'Add customer'}
          onPress={submit}
          loading={saving}
          disabled={!savingAllowed && !!customerId}
        />
        {!customerId && !canCreate ? (
          <Text style={styles.mutedSmall}>You don’t have permission to create customers.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  spacer: { height: spacing.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  muted: { color: colors.muted },
  mutedSmall: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  selectedCount: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
});
