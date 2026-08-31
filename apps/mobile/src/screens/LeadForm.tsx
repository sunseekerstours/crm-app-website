import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Button, Chip, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, spacing } from '../theme';

const LEAD_SOURCES = ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'PHONE', 'EMAIL', 'REFERRAL', 'WALK_IN', 'GOOGLE', 'PARTNER', 'MANUAL', 'IMPORT', 'OTHER'];
const LEAD_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

interface LeadDetail {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  source: string;
  campaign?: string | null;
  destination?: string | null;
  interestedTour?: string | null;
  estimatedValue?: number | null;
  currency?: string | null;
  leadScore?: number | null;
  nextAction?: string | null;
  stage: string;
  tags?: string[];
}

export default function LeadFormScreen({
  leadId,
  onBack,
  onDone,
  hasPerm,
}: {
  leadId?: string;
  onBack: () => void;
  onDone: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [source, setSource] = useState('');
  const [campaign, setCampaign] = useState('');
  const [destination, setDestination] = useState('');
  const [interestedTour, setInterestedTour] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [leadScore, setLeadScore] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [stage, setStage] = useState('NEW');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (leadId) {
        const d = await api.get<LeadDetail>(`/leads/${leadId}`);
        setFirstName(d.firstName ?? '');
        setLastName(d.lastName ?? '');
        setEmail(d.email ?? '');
        setPhone(d.phone ?? '');
        setWhatsapp(d.whatsapp ?? '');
        setSource(d.source ?? '');
        setCampaign(d.campaign ?? '');
        setDestination(d.destination ?? '');
        setInterestedTour(d.interestedTour ?? '');
        setEstimatedValue(d.estimatedValue != null ? String(d.estimatedValue) : '');
        setCurrency(d.currency ?? 'GHS');
        setLeadScore(d.leadScore != null ? String(d.leadScore) : '');
        setNextAction(d.nextAction ?? '');
        setStage(d.stage ?? 'NEW');
        setTags((d.tags ?? []).join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!source) {
      Alert.alert('Missing info', 'Choose a lead source.');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      source,
      campaign: campaign.trim() || undefined,
      destination: destination.trim() || undefined,
      interestedTour: interestedTour.trim() || undefined,
      estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      currency: currency.trim() || undefined,
      leadScore: leadScore ? Number(leadScore) : undefined,
      nextAction: nextAction.trim() || undefined,
      stage: stage || undefined,
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (leadId) {
        await api.patch(`/leads/${leadId}`, body);
      } else {
        await api.post('/leads', body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save lead');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title={leadId ? 'Edit Lead' : 'New Lead'} onBack={onBack} />
        <Spinner />
      </Screen>
    );
  }

  const canCreate = hasPerm('leads.create');
  const canUpdate = hasPerm('leads.update');

  return (
    <Screen>
      <AppHeader title={leadId ? 'Edit Lead' : 'New Lead'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error ? <ErrorText text={error} /> : null}
        <SectionLabel>Contact</SectionLabel>
        <Field label="First name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />

        <View style={styles.spacer} />
        <SectionLabel>Source</SectionLabel>
        <View style={styles.chipRow}>
          {LEAD_SOURCES.map((s) => (
            <Chip key={s} label={s} selected={source === s} onPress={() => setSource(s === source ? '' : s)} />
          ))}
        </View>

        <View style={styles.spacer} />
        <SectionLabel>Sales</SectionLabel>
        <Field label="Campaign" value={campaign} onChangeText={setCampaign} />
        <Field label="Destination" value={destination} onChangeText={setDestination} />
        <Field label="Interested tour" value={interestedTour} onChangeText={setInterestedTour} />
        <Field label="Estimated value" value={estimatedValue} onChangeText={setEstimatedValue} keyboardType="numeric" />
        <Field label="Currency" value={currency} onChangeText={setCurrency} />
        <Field label="Lead score" value={leadScore} onChangeText={setLeadScore} keyboardType="numeric" />
        <Field label="Next action" value={nextAction} onChangeText={setNextAction} />
        <Field label="Tags (comma separated)" value={tags} onChangeText={setTags} />

        <View style={styles.spacer} />
        <SectionLabel>Stage</SectionLabel>
        <View style={styles.chipRow}>
          {LEAD_STAGES.map((st) => (
            <Chip key={st} label={st} selected={stage === st} onPress={() => setStage(st)} />
          ))}
        </View>

        <View style={styles.spacer} />
        <Button
          title={leadId ? 'Save changes' : 'Add lead'}
          onPress={submit}
          loading={saving}
          disabled={leadId ? !canUpdate : !canCreate}
        />
        {!leadId && !canCreate ? (
          <Text style={styles.mutedSmall}>You don’t have permission to create leads.</Text>
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
