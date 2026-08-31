import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Button, Chip, Empty, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

const BOOKING_STATUSES = ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];

interface CustomerOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export default function BookingFormScreen({
  onBack,
  onDone,
  hasPerm,
}: {
  onBack: () => void;
  onDone: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [customerId, setCustomerId] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [tourName, setTourName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState('');
  const [paxCount, setPaxCount] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: CustomerOption[] }>('/customers?limit=100');
        setCustomerOptions(res.items ?? []);
      } catch {
        setCustomerOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    if (!customerId) {
      Alert.alert('Missing info', 'Select a customer for this booking.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      customerId,
      tourName: tourName.trim() || undefined,
      startDate: startDate.trim() || undefined,
      status: status || undefined,
      paxCount: paxCount ? Number(paxCount) : undefined,
      totalPrice: totalPrice ? Number(totalPrice) : undefined,
      currency: currency.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      await api.post('/bookings', body);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create booking');
    } finally {
      setSaving(false);
    }
  }

  const canCreate = hasPerm('bookings.create');

  return (
    <Screen>
      <AppHeader title="New Booking" onBack={onBack} />
      {loading ? (
        <Spinner />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? <ErrorText text={error} /> : null}

          <View style={styles.spacer} />
          <SectionLabel>Customer *</SectionLabel>
          {customerOptions.length > 0 ? (
            <View style={styles.chipRow}>
              {customerOptions.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.id.slice(0, 8)}
                  selected={customerId === c.id}
                  onPress={() => {
                    setCustomerId(c.id);
                  }}
                />
              ))}
            </View>
          ) : (
            <Empty text="No customers available." />
          )}

          <Field label="Tour name" value={tourName} onChangeText={setTourName} placeholder="e.g. Ghana Highlights" />
          <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="e.g. 2026-11-10" />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Pax" value={paxCount} onChangeText={setPaxCount} keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Field label="Total price" value={totalPrice} onChangeText={setTotalPrice} keyboardType="numeric" />
            </View>
          </View>
          <Field label="Currency" value={currency} onChangeText={setCurrency} />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

          <View style={styles.spacer} />
          <SectionLabel>Status</SectionLabel>
          <View style={styles.chipRow}>
            {BOOKING_STATUSES.map((s) => (
              <Chip key={s} label={s.replace('_', ' ')} selected={status === s} onPress={() => setStatus(status === s ? '' : s)} />
            ))}
          </View>

          <View style={styles.spacer} />
          <Button title="Create booking" onPress={submit} loading={saving} disabled={!canCreate} />
          {!canCreate ? (
            <Text style={styles.mutedSmall}>You don’t have permission to create bookings.</Text>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  spacer: { height: spacing.lg },
  row: { flexDirection: 'row' },
  half: { flex: 1, marginRight: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  mutedSmall: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
});
