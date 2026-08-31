import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Button, Chip, Empty, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

const DEPARTURE_STATUSES = ['PLANNED', 'OPEN', 'GUARANTEED', 'FULL', 'CANCELLED', 'COMPLETED'];

interface TourOption {
  id: string;
  name: string;
}

export default function DepartureFormScreen({
  onBack,
  onDone,
  hasPerm,
}: {
  onBack: () => void;
  onDone: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [tourId, setTourId] = useState('');
  const [tourOptions, setTourOptions] = useState<TourOption[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [minPax, setMinPax] = useState('');
  const [maxPax, setMaxPax] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: TourOption[] }>('/tours?limit=100&status=ACTIVE');
        setTourOptions(res.items ?? []);
      } catch {
        setTourOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    if (!tourId) {
      Alert.alert('Missing info', 'Select a tour for this departure.');
      return;
    }
    if (!startDate) {
      Alert.alert('Missing info', 'Select a start date for this departure.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      tourId,
      startDate,
      endDate: endDate.trim() || undefined,
      status: status || undefined,
      minPax: minPax ? Number(minPax) : undefined,
      maxPax: maxPax ? Number(maxPax) : undefined,
      price: price ? Number(price) : undefined,
      currency: currency.trim() || undefined,
      note: note.trim() || undefined,
    };
    try {
      await api.post('/departures', body);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create departure');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create departure');
    } finally {
      setSaving(false);
    }
  }

  const canCreate = hasPerm('departures.create');

  return (
    <Screen>
      <AppHeader title="New Departure" onBack={onBack} />
      {loading ? (
        <Spinner />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? <ErrorText text={error} /> : null}

          <View style={styles.spacer} />
          <SectionLabel>Tour *</SectionLabel>
          {tourOptions.length > 0 ? (
            <View style={styles.chipRow}>
              {tourOptions.map((t) => (
                <Chip key={t.id} label={t.name} selected={tourId === t.id} onPress={() => setTourId(t.id)} />
              ))}
            </View>
          ) : (
            <Empty text="No active tours available." />
          )}

          <Field label="Start date *" value={startDate} onChangeText={setStartDate} placeholder="e.g. 2026-12-01" />
          <Field label="End date" value={endDate} onChangeText={setEndDate} placeholder="e.g. 2026-12-08" />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Min pax" value={minPax} onChangeText={setMinPax} keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Field label="Max pax" value={maxPax} onChangeText={setMaxPax} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Field label="Currency" value={currency} onChangeText={setCurrency} />
            </View>
          </View>
          <Field label="Note" value={note} onChangeText={setNote} />

          <View style={styles.spacer} />
          <SectionLabel>Status</SectionLabel>
          <View style={styles.chipRow}>
            {DEPARTURE_STATUSES.map((s) => (
              <Chip key={s} label={s.replace('_', ' ')} selected={status === s} onPress={() => setStatus(status === s ? '' : s)} />
            ))}
          </View>

          <View style={styles.spacer} />
          <Button title="Create departure" onPress={submit} loading={saving} disabled={!canCreate} />
          {!canCreate ? (
            <Text style={styles.mutedSmall}>You don’t have permission to create departures.</Text>
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
