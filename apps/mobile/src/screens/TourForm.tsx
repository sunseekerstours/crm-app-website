import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Button, Chip, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

const TOUR_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

interface TourDetail {
  id: string;
  name: string;
  slug?: string | null;
  summary?: string | null;
  description?: string | null;
  type?: string | null;
  difficulty?: string | null;
  durationDays?: number | null;
  minPax?: number | null;
  maxPax?: number | null;
  basePrice?: number | null;
  currency?: string | null;
  coverImage?: string | null;
  status: string;
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
}

export default function TourFormScreen({
  tourId,
  onBack,
  onDone,
  hasPerm,
}: {
  tourId?: string;
  onBack: () => void;
  onDone: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [minPax, setMinPax] = useState('');
  const [maxPax, setMaxPax] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [inclusions, setInclusions] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [highlights, setHighlights] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tourId) {
        const d = await api.get<TourDetail>(`/tours/${tourId}`);
        setName(d.name ?? '');
        setSlug(d.slug ?? '');
        setSummary(d.summary ?? '');
        setDescription(d.description ?? '');
        setType(d.type ?? '');
        setDifficulty(d.difficulty ?? '');
        setDurationDays(d.durationDays != null ? String(d.durationDays) : '');
        setMinPax(d.minPax != null ? String(d.minPax) : '');
        setMaxPax(d.maxPax != null ? String(d.maxPax) : '');
        setBasePrice(d.basePrice != null ? String(d.basePrice) : '');
        setCurrency(d.currency ?? 'GHS');
        setCoverImage(d.coverImage ?? '');
        setStatus(d.status ?? 'DRAFT');
        setInclusions((d.inclusions ?? []).join(', '));
        setExclusions((d.exclusions ?? []).join(', '));
        setHighlights((d.highlights ?? []).join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tour');
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Tour name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      summary: summary.trim() || undefined,
      description: description.trim() || undefined,
      type: type.trim() || undefined,
      difficulty: difficulty.trim() || undefined,
      durationDays: durationDays ? Number(durationDays) : undefined,
      minPax: minPax ? Number(minPax) : undefined,
      maxPax: maxPax ? Number(maxPax) : undefined,
      basePrice: basePrice ? Number(basePrice) : undefined,
      currency: currency.trim() || undefined,
      coverImage: coverImage.trim() || undefined,
      status: status || undefined,
      inclusions: inclusions.split(',').map((s) => s.trim()).filter(Boolean),
      exclusions: exclusions.split(',').map((s) => s.trim()).filter(Boolean),
      highlights: highlights.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (tourId) {
        await api.patch(`/tours/${tourId}`, body);
      } else {
        await api.post('/tours', body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tour');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save tour');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title={tourId ? 'Edit Tour' : 'New Tour'} onBack={onBack} />
        <Spinner />
      </Screen>
    );
  }

  const canCreate = hasPerm('tours.create');
  const canUpdate = hasPerm('tours.update');

  return (
    <Screen>
      <AppHeader title={tourId ? 'Edit Tour' : 'New Tour'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error ? <ErrorText text={error} /> : null}
        <SectionLabel>Details</SectionLabel>
        <Field label="Name *" value={name} onChangeText={setName} />
        <Field label="Slug" value={slug} onChangeText={setSlug} />
        <Field label="Type" value={type} onChangeText={setType} />
        <Field label="Difficulty" value={difficulty} onChangeText={setDifficulty} />
        <Field label="Duration (days)" value={durationDays} onChangeText={setDurationDays} keyboardType="numeric" />
        <Field label="Min pax" value={minPax} onChangeText={setMinPax} keyboardType="numeric" />
        <Field label="Max pax" value={maxPax} onChangeText={setMaxPax} keyboardType="numeric" />
        <Field label="Base price" value={basePrice} onChangeText={setBasePrice} keyboardType="numeric" />
        <Field label="Currency" value={currency} onChangeText={setCurrency} />
        <Field label="Cover image URL" value={coverImage} onChangeText={setCoverImage} />
        <Field label="Summary" value={summary} onChangeText={setSummary} multiline />
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
        <Field label="Inclusions (comma separated)" value={inclusions} onChangeText={setInclusions} multiline />
        <Field label="Exclusions (comma separated)" value={exclusions} onChangeText={setExclusions} multiline />
        <Field label="Highlights (comma separated)" value={highlights} onChangeText={setHighlights} multiline />

        <View style={styles.spacer} />
        <SectionLabel>Status</SectionLabel>
        <View style={styles.chipRow}>
          {TOUR_STATUSES.map((st) => (
            <Chip key={st} label={st} selected={status === st} onPress={() => setStatus(st)} />
          ))}
        </View>

        <View style={styles.spacer} />
        <Button
          title={tourId ? 'Save changes' : 'Add tour'}
          onPress={submit}
          loading={saving}
          disabled={tourId ? !canUpdate : !canCreate}
        />
        {!tourId && !canCreate ? (
          <Text style={styles.mutedSmall}>You don’t have permission to create tours.</Text>
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
