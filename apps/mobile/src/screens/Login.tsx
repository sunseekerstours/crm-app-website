import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Screen } from '../components/ui';
import { colors, spacing } from '../theme';

export default function Login({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('admin@sunseeker.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.titleWrap}>
        <Text style={styles.brand}>Sunseekers CRM</Text>
        <Text style={styles.sub}>Staff mobile workspace</Text>
      </View>
      <View style={styles.form}>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleWrap: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.xl },
  brand: { fontSize: 24, fontWeight: '700', color: colors.primary },
  sub: { color: colors.muted, marginTop: 4 },
  form: { alignSelf: 'stretch' },
});
