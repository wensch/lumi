import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useYVAuth } from '@youversion/platform-react-native-expo-core';
import { Button, Card, ScreenContainer, TextField } from '@/components';
import { isValidEmail, translateAuthError, useAuth } from '@/features/auth';
import { LumiMascot } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

type Mode = 'sign_in' | 'sign_up';
type Method = 'password' | 'magic_link';

export default function AuthScreen() {
  const { signInWithPassword, signUpWithPassword, signInWithMagicLink } = useAuth();
  const {
    signIn: signInWithYouVersion,
    isAuthenticated: yvAuthenticated,
    userInfo: yvUserInfo,
    error: yvAuthError,
  } = useYVAuth();

  const [mode, setMode] = useState<Mode>('sign_in');
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [youVersionError, setYouVersionError] = useState<string | null>(null);
  const bridgedYvUserId = useRef<string | null>(null);

  const handleYouVersionSignIn = async () => {
    setYouVersionError(null);
    setError(null);
    setSubmitting(true);
    try {
      await signInWithYouVersion();
      // userInfo só fica disponível no estado do hook depois que signIn()
      // resolve e o provider re-renderiza — a ponte pro Supabase acontece
      // no useEffect abaixo, reagindo a yvAuthenticated/yvUserInfo.
    } catch {
      setYouVersionError('Não foi possível conectar com a YouVersion. Tente de novo.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (yvAuthError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com erro reportado pelo SDK YouVersion (sistema externo)
      setYouVersionError('Não foi possível conectar com a YouVersion. Tente de novo.');
      setSubmitting(false);
      return;
    }

    if (!yvAuthenticated) return;

    if (!yvUserInfo?.email) {
      setYouVersionError(
        'Sua conta YouVersion não retornou um email. Tente outro método de login.',
      );
      setSubmitting(false);
      return;
    }

    // Evita repetir a ponte pro Supabase toda vez que o hook re-renderiza
    // com o mesmo usuário já autenticado.
    if (bridgedYvUserId.current === yvUserInfo.id) return;
    bridgedYvUserId.current = yvUserInfo.id ?? yvUserInfo.email;

    (async () => {
      const { error: authError } = await signInWithMagicLink(yvUserInfo.email as string);
      setSubmitting(false);
      if (authError) {
        setError(translateAuthError(authError));
        return;
      }
      setEmail(yvUserInfo.email as string);
      setMagicLinkSent(true);
    })();
  }, [yvAuthenticated, yvUserInfo, yvAuthError, signInWithMagicLink]);

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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              variant="tertiary"
              label={method === 'password' ? 'Entrar sem senha (magic link)' : 'Entrar com senha'}
              onPress={() => {
                setMethod(method === 'password' ? 'magic_link' : 'password');
                setError(null);
                setMagicLinkSent(false);
              }}
            />

            {method === 'password' && mode === 'sign_in' ? (
              <Button
                variant="tertiary"
                label="Esqueci minha senha"
                onPress={() => router.push('/(auth)/esqueci-senha')}
              />
            ) : null}
          </Card>

          {method === 'password' ? (
            <View style={styles.toggleRow}>
              <Text style={typography.body}>
                {mode === 'sign_in' ? 'Ainda não tem conta?' : 'Já tem conta?'}
              </Text>
              <Button
                variant="tertiary"
                label={mode === 'sign_in' ? 'Criar conta' : 'Entrar'}
                onPress={() => {
                  setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
                  setError(null);
                }}
              />
            </View>
          ) : null}

          <Card style={styles.card}>
            {youVersionError ? <Text style={styles.errorText}>{youVersionError}</Text> : null}
            <Button
              variant="ghost"
              label="Entrar com YouVersion"
              onPress={handleYouVersionSignIn}
              disabled={submitting}
            />
            <Text style={[typography.caption, styles.subtitle]}>
              Enviamos um link de confirmação para o email da sua conta YouVersion.
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
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
