import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Button, Chip, Empty, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

const DEAL_STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'DEPOSIT', 'WON', 'LOST'];

interface CustomerOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface DealDetail {
  id: string;
  name?: string | null;
  customerId?: string | null;
  customer?: CustomerOption | null;
  tour?: string | null;
  destination?: string | null;
  value?: number | null;
  currency?: string | null;
  probability?: number | null;
  stage: string;
  expectedCloseDate?: string | null;
  source?: string | null;
  notes?: string | null;
  tags?: string[];
}

export default function DealFormScreen({
  dealId,
  onBack,
  onDone,
  hasPerm,
}: {
  dealId?: string;
  onBack: () => void;
  onDone: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [tour, setTour] = useState('');
  const [destination, setDestination] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [probability, setProbability] = useState('50');
  const [stage, setStage] = useState('NEW');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const custRes = await api.get<{ items: CustomerOption[] }>('/customers?limit=100').catch(() => ({ items: [] }));
      setCustomerOptions(custRes.items ?? []);

      if (dealId) {
        const d = await api.get<DealDetail>(`/deals/${dealId}`);
        setName(d.name ?? '');
        setCustomerId(d.customerId ?? d.customer?.id ?? '');
        setTour(d.tour ?? '');
        setDestination(d.destination ?? '');
        setValue(d.value != null ? String(d.value) : '');
        setCurrency(d.currency ?? 'USD');
        setProbability(d.probability != null ? String(d.probability) : '50');
        setStage(d.stage ?? 'NEW');
        setExpectedCloseDate(d.expectedCloseDate ?? '');
        setSource(d.source ?? '');
        setNotes(d.notes ?? '');
        setTags((d.tags ?? []).join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deal');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Deal name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      customerId: customerId || undefined,
      tour: tour.trim() || undefined,
      destination: destination.trim() || undefined,
      value: value ? Number(value) : undefined,
      currency: currency.trim() || 'USD',
      probability: probability ? Number(probability) : undefined,
      stage: stage || undefined,
      expectedCloseDate: expectedCloseDate.trim() || undefined,
      source: source || undefined,
      notes: notes.trim() || undefined,
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (dealId) {
        await api.patch(`/deals/${dealId}`, body);
      } else {
        await api.post('/deals', body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deal');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save deal');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title={dealId ? 'Edit Deal' : 'New Deal'} onBack={onBack} />
        <Spinner />
      </Screen>
    );
  }

  const canCreate = hasPerm('deals.create');
  const canUpdate = hasPerm('deals.update');

  return (
    <Screen>
      <AppHeader title={dealId ? 'Edit Deal' : 'New Deal'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error ? <ErrorText text={error} /> : null}
        <SectionLabel>Deal Information</SectionLabel>
        <Field label="Name *" value={name} onChangeText={setName} placeholder="e.g. 10-Pax Luxury Tour" />

        <View style={styles.spacer} />
        <SectionLabel>Customer (optional)</SectionLabel>
        {customerOptions.length > 0 ? (
          <View style={styles.chipRow}>
            {customerOptions.map((c) => {
              const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
              return (
                <Chip
                  key={c.id}
                  label={name || c.email || c.id.slice(0, 8)}
                  selected={customerId === c.id}
                  onPress={() => setCustomerId(customerId === c.id ? '' : c.id)}
                />
              );
            })}
          </View>
        ) : (
          <Empty text="No customers available." />
        )}

        <Field label="Value" value={value} onChangeText={setValue} keyboardType="numeric" placeholder="e.g. 5000" />
        <Field label="Currency" value={currency} onChangeText={setCurrency} />
        <Field label="Probability (%)" value={probability} onChangeText={setProbability} keyboardType="numeric" />
        <Field label="Tour / package" value={tour} onChangeText={setTour} />
        <Field label="Destination" value={destination} onChangeText={setDestination} />
        <Field label="Expected close date" value={expectedCloseDate} onChangeText={setExpectedCloseDate} placeholder="e.g. 2026-12-31" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        <Field label="Tags (comma separated)" value={tags} onChangeText={setTags} />

        <View style={styles.spacer} />
        <SectionLabel>Stage</SectionLabel>
        <View style={styles.chipRow}>
          {DEAL_STAGES.map((st) => (
            <Chip key={st} label={st} selected={stage === st} onPress={() => setStage(st)} />
          ))}
        </View>

        <View style={styles.spacer} />
        <Button
          title={dealId ? 'Save changes' : 'Add deal'}
          onPress={submit}
          loading={saving}
          disabled={dealId ? !canUpdate : !canCreate}
        />
        {!dealId && !canCreate ? (
          <Text style={styles.mutedSmall}>You don’t have permission to create deals.</Text>
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
