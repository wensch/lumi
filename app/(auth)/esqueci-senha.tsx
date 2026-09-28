import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, TextField } from '@/components';
import { isValidEmail, useAuth } from '@/features/auth';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';

export default function EsqueciSenhaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
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
    <Screen centered contentContainerStyle={styles.content}>
      <LumiMascot mood="waiting" size={120} />
      <Text style={[theme.typography.title, styles.title]}>Esqueceu sua senha?</Text>
      <Text style={[theme.typography.body, styles.subtitle]}>
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
        {sent ? <Text style={styles.successText}>Link enviado! Confira seu email.</Text> : null}

        <Button
          label={submitting ? 'Enviando...' : 'Enviar link de redefinição'}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </Card>

      <Button variant="tertiary" label="Voltar" onPress={() => router.back()} />
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
    },
    title: {
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.muted,
      textAlign: 'center',
    },
    card: {
      width: '100%',
      gap: theme.spacing.md,
    },
    errorText: {
      ...theme.typography.caption,
      color: '#E05252',
    },
    successText: {
      ...theme.typography.caption,
      color: theme.colors.ink,
    },
  });
