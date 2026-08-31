import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function AppHeader({
  title,
  onBack,
  right,
  onRight,
  rightLabel,
}: {
  title: string;
  onBack?: () => void;
  right?: boolean;
  rightLabel?: string;
  onRight?: () => void;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.headerBtn}>
          <Text style={styles.headerLink}>‹ Back</Text>
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {right ? (
        <Pressable onPress={onRight} hitSlop={8} style={styles.headerBtn}>
          <Text style={styles.headerLink}>{rightLabel ?? '+'}</Text>
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === 'danger'
      ? colors.danger
      : variant === 'secondary'
        ? '#eef2f0'
        : variant === 'ghost'
          ? 'transparent'
          : colors.primary;
  const fg = variant === 'secondary' ? colors.text : variant === 'ghost' ? colors.primary : '#ffffff';
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg }, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  numberOfLines,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'numeric' | 'default' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

const BADGE_COLORS: Record<string, string> = {
  primary: colors.primaryLight,
  danger: colors.dangerLight,
  warning: colors.warningLight,
  info: colors.infoLight,
};

export function Badge({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'danger' | 'warning' | 'info';
}) {
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_COLORS[tone] }]}>
      <Text style={[styles.badgeText, { color: tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.info }]}>
        {label}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      disabled={!onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Spinner() {
  return <ActivityIndicator size="large" color={colors.primary} style={{ padding: spacing.xl }} />;
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

export function ErrorText({ text }: { text: string }) {
  return <Text style={styles.error}>{text}</Text>;
}

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      <View>{children}</View>
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.header,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: { minWidth: 64 },
  headerTitle: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  headerLink: { color: colors.headerText, fontSize: 15, fontWeight: '600' },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '700', fontSize: 15 },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, color: colors.muted, marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.panel,
    color: colors.text,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#ffffff' },
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: { fontSize: 13, color: colors.muted, marginBottom: spacing.md, fontWeight: '700' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
});
