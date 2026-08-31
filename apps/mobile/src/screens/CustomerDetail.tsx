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

interface BookingItem {
  id: string;
  bookingNumber?: string;
  tourName?: string;
  status?: string;
  totalPrice?: number | string;
  currency?: string;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: number | string;
  amountPaid: number | string;
  currency: string;
  status: string;
}

interface PaymentItem {
  id: string;
  paymentNumber: string;
  receiptNumber?: string;
  amount: number | string;
  currency: string;
  method: string;
}

const LEAD_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const DEAL_STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'DEPOSIT', 'WON', 'LOST'];
const PRODUCT_CATEGORIES = ['GHANA_TOUR', 'INTERNATIONAL_TOUR', 'FLIGHT', 'HOTEL', 'CAR_RENTAL', 'OTHER'];

function toneForStatus(s?: string) {
  if (!s) return 'info' as const;
  const v = s.toUpperCase();
  if (v === 'LOST' || v === 'BLOCKED' || v === 'INACTIVE' || v === 'CANCELLED') return 'danger' as const;
  if (v === 'WON' || v === 'ACTIVE' || v === 'CONFIRMED' || v === 'PAID') return 'primary' as const;
  if (v === 'DEPOSIT' || v === 'NEGOTIATION' || v === 'PARTIALLY_PAID') return 'warning' as const;
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
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, n, b, inv, p] = await Promise.all([
        api.get<CustomerDetail>(`/customers/${customerId}`),
        api.get<{ items: Note[] }>(`/notes?customerId=${customerId}&limit=50`).catch(() => ({ items: [] })),
        api.get<{ items: BookingItem[] }>(`/bookings?customerId=${customerId}&limit=50`).catch(() => ({ items: [] })),
        api.get<{ items: InvoiceItem[] }>(`/invoices?customerId=${customerId}&limit=50`).catch(() => ({ items: [] })),
        api.get<{ items: PaymentItem[] }>(`/payments?customerId=${customerId}&limit=50`).catch(() => ({ items: [] })),
      ]);
      setCustomer(c);
      setNotes(n.items ?? []);
      setBookings(b.items ?? []);
      setInvoices(inv.items ?? []);
      setPayments(p.items ?? []);
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

        {/* Bookings & Financials */}
        <Card title="Bookings & Invoices">
          {bookings.length > 0 ? (
            <View style={styles.group}>
              <SectionLabel>Bookings ({bookings.length})</SectionLabel>
              {bookings.map((b) => (
                <View key={b.id} style={styles.finRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.finTitle}>{b.tourName || b.bookingNumber}</Text>
                    <Text style={styles.finSub}>{b.bookingNumber}</Text>
                  </View>
                  <Text style={styles.finAmt}>${b.totalPrice ?? '0'}</Text>
                  <Badge label={b.status ?? 'PENDING'} tone={toneForStatus(b.status)} />
                </View>
              ))}
            </View>
          ) : null}

          {invoices.length > 0 ? (
            <View style={styles.group}>
              <SectionLabel>Invoices ({invoices.length})</SectionLabel>
              {invoices.map((inv) => (
                <View key={inv.id} style={styles.finRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.finTitle}>{inv.invoiceNumber}</Text>
                    <Text style={styles.finSub}>Paid: ${inv.amountPaid ?? '0'}</Text>
                  </View>
                  <Text style={styles.finAmt}>${inv.amount}</Text>
                  <Badge label={inv.status} tone={toneForStatus(inv.status)} />
                </View>
              ))}
            </View>
          ) : null}

          {payments.length > 0 ? (
            <View style={styles.group}>
              <SectionLabel>Receipts & Payments ({payments.length})</SectionLabel>
              {payments.map((p) => (
                <View key={p.id} style={styles.finRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.finTitle}>{p.receiptNumber || p.paymentNumber}</Text>
                    <Text style={styles.finSub}>{p.method}</Text>
                  </View>
                  <Text style={[styles.finAmt, { color: colors.primary }]}>${p.amount}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {bookings.length === 0 && invoices.length === 0 && payments.length === 0 && (
            <Text style={styles.muted}>No bookings or invoices recorded for this customer yet.</Text>
          )}
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
            <Text style={styles.muted}>No linked lead or deal.</Text>
          ) : null}

          {(customer.leads ?? []).map((lead) => {
            const stages = LEAD_STAGES;
            return (
              <View key={lead.id} style={styles.stageBlock}>
                <View style={styles.stageHead}>
                  <Text style={styles.stageTitle}>Lead</Text>
                  <Badge label={lead.stage} tone={toneForStatus(lead.stage)} />
                </View>
                <Text style={styles.stageHint}>Update lead stage:</Text>
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
              <Text style={styles.stageHint}>Update deal stage:</Text>
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
  finRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  finTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  finSub: { fontSize: 11, color: colors.muted },
  finAmt: { fontSize: 14, fontWeight: '800', color: colors.text, marginHorizontal: spacing.sm },
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
