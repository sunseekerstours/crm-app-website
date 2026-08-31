import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { AppHeader, Badge, Button, Chip, Empty, ErrorText, Field, Screen, SectionLabel } from '../components/ui';
import { colors, radius, spacing } from '../theme';

interface Product {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
  price: number | null;
  currency: string;
  isActive: boolean;
  _count?: { customers?: number };
}

const PRODUCT_CATEGORIES = ['GHANA_TOUR', 'INTERNATIONAL_TOUR', 'FLIGHT', 'HOTEL', 'CAR_RENTAL', 'OTHER'];

export default function ProductScreen({
  onBack,
  hasPerm,
}: {
  onBack: () => void;
  hasPerm: (p: string) => boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const canCreate = hasPerm('products.create');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<{ items: Product[] }>('/products?limit=100');
      setProducts(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function addProduct() {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Product name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post('/products', {
        name: name.trim(),
        category,
        price: price.trim() || undefined,
        currency: currency.trim() || 'GHS',
        description: description.trim() || undefined,
      });
      setShowForm(false);
      setName('');
      setPrice('');
      setCurrency('GHS');
      setDescription('');
      setCategory('OTHER');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add product');
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title="Products & Services"
        onBack={onBack}
        right={canCreate}
        rightLabel="+ Add"
        onRight={() => setShowForm((v) => !v)}
      />
      {error ? <ErrorText text={error} /> : null}

      {showForm ? (
        <ScrollView style={styles.formWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <SectionLabel>New product</SectionLabel>
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Accra – Kumasi Flight" />
            <SectionLabel>Category</SectionLabel>
            <View style={styles.chipRow}>
              {PRODUCT_CATEGORIES.map((c) => (
                <Chip key={c} label={c.replace('_', ' ')} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
            <Field label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 1200" />
            <Field label="Currency" value={currency} onChangeText={setCurrency} />
            <Field label="Description" value={description} onChangeText={setDescription} multiline />
            <Button title="Save product" onPress={addProduct} loading={saving} disabled={!name.trim()} />
          </View>
        </ScrollView>
      ) : null}

      {loading ? (
        <Empty text="Loading…" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<Empty text="No products yet. Tap + Add to create one." />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <View style={styles.metaRow}>
                  {item.category ? <Badge label={item.category.replace('_', ' ')} tone="info" /> : null}
                  {!item.isActive ? <Badge label="inactive" tone="danger" /> : null}
                  <Text style={styles.rowCount}>
                    {item._count && item._count.customers != null ? `${item._count.customers} customer${item._count.customers === 1 ? '' : 's'}` : ''}
                  </Text>
                </View>
                {item.description ? <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text> : null}
              </View>
              {item.price != null ? (
                <Text style={styles.rowPrice}>{item.price.toLocaleString()} {item.currency}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  formWrap: { padding: spacing.lg, maxHeight: 420 },
  formCard: { marginBottom: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowMain: { flex: 1, marginRight: spacing.sm },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, gap: 6 },
  rowCount: { color: colors.muted, fontSize: 12 },
  rowDesc: { color: colors.muted, fontSize: 13, marginTop: 4 },
  rowPrice: { color: colors.primary, fontWeight: '800', fontSize: 15 },
});
