import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenContainer, TextField } from '@/components';
import { isValidEmail, translateAuthError, useAuth } from '@/features/auth';
import { LumiMascot } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

type Mode = 'sign_in' | 'sign_up';
type Method = 'password' | 'magic_link';

export default function AuthScreen() {
  const { signInWithPassword, signUpWithPassword, signInWithMagicLink } = useAuth();

  const [mode, setMode] = useState<Mode>('sign_in');
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setMagicLinkSent(false);
    setNeedsEmailConfirmation(false);

    if (!email.trim()) {
      setError('Informe seu email.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Email inválido.');
      return;
    }

    setSubmitting(true);
    try {
      if (method === 'magic_link') {
        const { error: authError } = await signInWithMagicLink(email.trim());
        if (authError) {
          setError(translateAuthError(authError));
        } else {
          setMagicLinkSent(true);
        }
        return;
      }

      if (!password) {
        setError('Informe sua senha.');
        return;
      }

      if (mode === 'sign_in') {
        const { error: authError } = await signInWithPassword(email.trim(), password);
        if (authError) {
          setError(translateAuthError(authError));
        }
        return;
      }

      const { error: authError, needsEmailConfirmation: shouldConfirm } = await signUpWithPassword(
        email.trim(),
        password,
      );

      if (authError) {
        setError(translateAuthError(authError));
      } else if (shouldConfirm) {
        setNeedsEmailConfirmation(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.mascotWrapper}>
        <LumiMascot mood="normal" size={120} />
      </View>
      <Text style={typography.title}>Bem-vindo ao Lumi</Text>
      <Text style={[typography.body, styles.subtitle]}>
        {mode === 'sign_in'
          ? 'Entre para continuar sua constância.'
          : 'Crie sua conta para começar.'}
      </Text>

      <Card style={styles.card}>
        <TextField
          label="Email"
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {method === 'password' ? (
          <TextField
            label="Senha"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {magicLinkSent ? (
          <Text style={styles.successText}>Link enviado! Confira seu email.</Text>
        ) : null}
        {needsEmailConfirmation ? (
          <Text style={styles.successText}>
            Conta criada! Confira seu email para confirmar antes de entrar.
          </Text>
        ) : null}

        <Button
          label={
            method === 'magic_link'
              ? 'Enviar link mágico'
              : mode === 'sign_in'
                ? 'Entrar'
                : 'Criar conta'
          }
          onPress={handleSubmit}
          disabled={submitting}
        />

        <Button
          variant="ghost"
          label={method === 'password' ? 'Entrar sem senha (magic link)' : 'Entrar com senha'}
          onPress={() => {
            setMethod(method === 'password' ? 'magic_link' : 'password');
            setError(null);
            setMagicLinkSent(false);
          }}
        />
      </Card>

      {method === 'password' ? (
        <View style={styles.toggleRow}>
          <Text style={typography.body}>
            {mode === 'sign_in' ? 'Ainda não tem conta?' : 'Já tem conta?'}
          </Text>
          <Button
            variant="ghost"
            label={mode === 'sign_in' ? 'Criar conta' : 'Entrar'}
            onPress={() => {
              setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
              setError(null);
            }}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  mascotWrapper: {
    alignItems: 'center',
  },
  subtitle: {
    color: colors.ink,
    textAlign: 'center',
  },
  card: {
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
