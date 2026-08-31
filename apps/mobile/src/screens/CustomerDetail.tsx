import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api';
import { AppHeader, Badge, Button, Card, Chip, Empty, ErrorText, Field, Screen, SectionLabel, Spinner } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type { Route } from '../navigation';

export interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  nationality?: string | null;
  country?: string | null;
  address?: string | null;
  preferredLanguage?: string | null;
  preferredCommunication?: string | null;
  leadSource?: string | null;
  status: string;
  tags?: string[];
  company?: { id: string; name: string } | null;
  leads?: { id: string; stage: string }[];
  deals?: { id: string; name: string; stage: string }[];
  products?: { id: string; name: string; category?: string | null }[];
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: { firstName?: string; lastName?: string } | null;
}

const LEAD_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const DEAL_STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'DEPOSIT', 'WON', 'LOST'];

const PRODUCT_CATEGORIES = ['GHANA_TOUR', 'INTERNATIONAL_TOUR', 'FLIGHT', 'HOTEL', 'OTHER'];

function toneForStatus(s?: string) {
  if (!s) return 'info' as const;
  const v = s.toUpperCase();
  if (v === 'LOST' || v === 'BLOCKED' || v === 'INACTIVE') return 'danger' as const;
  if (v === 'WON' || v === 'ACTIVE') return 'primary' as const;
  if (v === 'DEPOSIT' || v === 'NEGOTIATION') return 'warning' as const;
  return 'info' as const;
}

export default function CustomerDetailScreen({
  customerId,
  onBack,
  onEdit,
}: {
  customerId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, n] = await Promise.all([
        api.get<CustomerDetail>(`/customers/${customerId}`),
        api.get<{ items: Note[] }>(`/notes?customerId=${customerId}&limit=50`).catch(() => ({ items: [] })),
      ]);
      setCustomer(c);
      setNotes(n.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function addNote() {
    const content = noteText.trim();
    if (!content) return;
    setSavingNote(true);
    try {
      await api.post(`/customers/${customerId}/notes`, { content });
      setNoteText('');
      load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add note');
    } finally {
      setSavingNote(false);
    }
  }

  async function moveStage(kind: 'lead' | 'deal', id: string, stage: string) {
    try {
      const endpoint = kind === 'lead' ? `/leads/${id}` : `/deals/${id}`;
      await api.patch(endpoint, { stage });
      load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not update stage');
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Customer" onBack={onBack} />
        <Spinner />
      </Screen>
    );
  }

  if (!customer) {
    return (
      <Screen>
        <AppHeader title="Customer" onBack={onBack} />
        {error ? <ErrorText text={error} /> : <Empty text="Customer not found." />}
      </Screen>
    );
  }

  const name = `${customer.firstName} ${customer.lastName}`.trim();

  const groupedProducts: Record<string, { id: string; name: string }[]> = {};
  (customer.products ?? []).forEach((p) => {
    const cat = p.category ?? 'OTHER';
    groupedProducts[cat] = groupedProducts[cat] ?? [];
    groupedProducts[cat].push({ id: p.id, name: p.name });
  });

  return (
    <Screen>
      <AppHeader
        title={name || 'Customer'}
        onBack={onBack}
        right
        rightLabel="Edit"
        onRight={() => onEdit(customer.id)}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {error ? <ErrorText text={error} /> : null}

        <Card>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            <Badge label={customer.status} tone={toneForStatus(customer.status)} />
          </View>
          {customer.company ? <Text style={styles.company}>{customer.company.name}</Text> : null}
          <View style={styles.infoGrid}>
            {customer.email ? <Text style={styles.info}>✉ {customer.email}</Text> : null}
            {customer.phone ? <Text style={styles.info}>📞 {customer.phone}</Text> : null}
            {customer.whatsapp ? <Text style={styles.info}>💬 {customer.whatsapp}</Text> : null}
            {customer.country ? <Text style={styles.info}>🌍 {customer.country}{customer.nationality ? ` · ${customer.nationality}` : ''}</Text> : null}
            {customer.address ? <Text style={styles.info}>📍 {customer.address}</Text> : null}
            {customer.leadSource ? <Text style={styles.info}>🎯 Source: {customer.leadSource}</Text> : null}
            {customer.preferredCommunication ? <Text style={styles.info}>✉ Prefers: {customer.preferredCommunication}</Text> : null}
          </View>
          {customer.tags && customer.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {customer.tags.map((t) => (
                <Badge key={t} label={t} tone="warning" />
              ))}
            </View>
          ) : null}
        </Card>

        <Card title="Products & Services">
          {customer.products && customer.products.length > 0 ? (
            <View>
              {PRODUCT_CATEGORIES.map((cat) => {
                const items = groupedProducts[cat];
                if (!items || items.length === 0) return null;
                return (
                  <View key={cat} style={styles.group}>
                    <SectionLabel>{cat.replace('_', ' ')}</SectionLabel>
                    <View style={styles.tagRow}>
                      {items.map((p) => (
                        <Badge key={p.id} label={p.name} />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.muted}>No products linked yet.</Text>
          )}
        </Card>

        <Card title="Sales Process">
          {(!customer.leads || customer.leads.length === 0) &&
          (!customer.deals || customer.deals.length === 0) ? (
            <Text style={styles.muted}>No linked lead or deal. Move this customer through the sales process by updating the linked lead/deal stages.</Text>
          ) : null}

          {(customer.leads ?? []).map((lead) => {
            const stages = LEAD_STAGES;
            return (
              <View key={lead.id} style={styles.stageBlock}>
                <View style={styles.stageHead}>
                  <Text style={styles.stageTitle}>Lead</Text>
                  <Badge label={lead.stage} tone={toneForStatus(lead.stage)} />
                </View>
                <Text style={styles.stageHint}>Update lead stage to move it through the pipeline:</Text>
                <View style={styles.chipRow}>
                  {stages.map((st) => (
                    <Chip
                      key={st}
                      label={st}
                      selected={lead.stage === st}
                      onPress={() => moveStage('lead', lead.id, st)}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          {(customer.deals ?? []).map((deal) => (
            <View key={deal.id} style={styles.stageBlock}>
              <View style={styles.stageHead}>
                <Text style={styles.stageTitle}>Deal{deal.name ? ` · ${deal.name}` : ''}</Text>
                <Badge label={deal.stage} tone={toneForStatus(deal.stage)} />
              </View>
              <Text style={styles.stageHint}>Update deal stage to move it through the pipeline:</Text>
              <View style={styles.chipRow}>
                {DEAL_STAGES.map((st) => (
                  <Chip
                    key={st}
                    label={st}
                    selected={deal.stage === st}
                    onPress={() => moveStage('deal', deal.id, st)}
                  />
                ))}
              </View>
            </View>
          ))}
        </Card>

        <Card title="Notes">
          <Field
            label="Add a note"
            placeholder="Write a note about this customer…"
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
          <Button title="Add note" onPress={addNote} loading={savingNote} disabled={!noteText.trim()} />
          {notes.length > 0 ? (
            <View style={styles.noteList}>
              {notes.map((n) => (
                <View key={n.id} style={styles.note}>
                  <Text style={styles.noteDate}>{new Date(n.createdAt).toLocaleString()}</Text>
                  <Text style={styles.noteText}>{n.content}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>No notes yet.</Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, flex: 1, marginRight: spacing.sm },
  company: { color: colors.muted, marginTop: 2, fontWeight: '600' },
  infoGrid: { marginTop: spacing.md },
  info: { color: colors.text, marginBottom: 4, fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  muted: { color: colors.muted },
  group: { marginBottom: spacing.md },
  stageBlock: { marginBottom: spacing.md },
  stageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stageTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  stageHint: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  noteList: { marginTop: spacing.lg },
  note: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noteDate: { fontSize: 11, color: colors.muted, marginBottom: 2 },
  noteText: { fontSize: 14, color: colors.text },
});
