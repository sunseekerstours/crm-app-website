import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Button, Chip, Empty, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'];

interface CustomerOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export default function PaymentFormScreen({
  onBack,
  onDone,
  hasPerm,
}: {
  onBack: () => void;
  onDone: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: CustomerOption[] }>('/customers?limit=100').catch(() => ({ items: [] as CustomerOption[] }));
        setCustomerOptions(res.items ?? []);
      } catch {
        setCustomerOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Missing info', 'Enter a valid payment amount.');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      amount: amt,
      currency: currency.trim() || undefined,
      method: method || undefined,
      reference: reference.trim() || undefined,
      paidAt: paidAt.trim() || undefined,
      notes: notes.trim() || undefined,
      customerId: customerId || undefined,
    };
    try {
      await api.post('/payments', body);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not record payment');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Record Payment" onBack={onBack} />
        <Spinner />
      </Screen>
    );
  }

  const canCreate = hasPerm('payments.create');

  return (
    <Screen>
      <AppHeader title="Record Payment" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error ? <ErrorText text={error} /> : null}
        <SectionLabel>Payment</SectionLabel>
        <Field label="Amount *" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <Field label="Currency" value={currency} onChangeText={setCurrency} />
        <Field label="Reference" value={reference} onChangeText={setReference} placeholder="e.g. Invoice #0042" />
        <Field label="Date paid" value={paidAt} onChangeText={setPaidAt} placeholder="e.g. 2026-08-31" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

        <View style={styles.spacer} />
        <SectionLabel>Method</SectionLabel>
        <View style={styles.chipRow}>
          {PAYMENT_METHODS.map((m) => (
            <Chip key={m} label={m.replace('_', ' ')} selected={method === m} onPress={() => setMethod(method === m ? '' : m)} />
          ))}
        </View>

        <View style={styles.spacer} />
        <SectionLabel>Customer (optional)</SectionLabel>
        {customerOptions.length > 0 ? (
          <View style={styles.chipRow}>
            {customerOptions.map((c) => (
              <Chip
                key={c.id}
                label={`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.id.slice(0, 8)}
                selected={customerId === c.id}
                onPress={() => setCustomerId(customerId === c.id ? '' : c.id)}
              />
            ))}
          </View>
        ) : (
          <Empty text="No customers available." />
        )}

        <View style={styles.spacer} />
        <Button title="Record payment" onPress={submit} loading={saving} disabled={!canCreate} />
        {!canCreate ? (
          <Text style={styles.mutedSmall}>You don’t have permission to record payments.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  spacer: { height: spacing.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  mutedSmall: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
});
