import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, ScreenContainer, TextField } from '@/components';
import { isValidEmail, useAuth } from '@/features/auth';
import { LumiMascot } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

export default function EsqueciSenhaScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Informe seu email.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Email inválido.');
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await sendPasswordReset(email.trim());
    setSubmitting(false);

    if (resetError) {
      setError('Não foi possível enviar o link agora. Tenta de novo em instantes.');
      return;
    }

    setSent(true);
  };

  return (
    <ScreenContainer style={styles.container}>
      <LumiMascot mood="waiting" size={120} />
      <Text style={typography.title}>Esqueceu sua senha?</Text>
      <Text style={[typography.body, styles.subtitle]}>
        Informa seu email que a gente manda um link pra você criar uma nova.
      </Text>

      <Card style={styles.card}>
        <TextField
          label="Email"
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {sent ? (
          <Text style={styles.successText}>Link enviado! Confira seu email.</Text>
        ) : null}

        <Button
          label={submitting ? 'Enviando...' : 'Enviar link de redefinição'}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </Card>

      <Button variant="ghost" label="Voltar" onPress={() => router.back()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    color: colors.ink,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: '#E05252',
  },
  successText: {
    ...typography.caption,
    color: colors.greenDark,
  },
});
