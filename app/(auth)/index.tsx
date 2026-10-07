import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useYVAuth } from '@youversion/platform-react-native-expo-core';
import { Button, Card, FadeIn, ScreenContainer, TextField } from '@/components';
import { isValidEmail, translateAuthError, useAuth } from '@/features/auth';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type Mode = 'sign_in' | 'sign_up';
type Method = 'password' | 'magic_link';

export default function AuthScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
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
      setYouVersionError(t('auth.youVersionError'));
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (yvAuthError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com erro reportado pelo SDK YouVersion (sistema externo)
      setYouVersionError(t('auth.youVersionError'));
      setSubmitting(false);
      return;
    }

    if (!yvAuthenticated) return;

    if (!yvUserInfo?.email) {
      setYouVersionError(t('auth.youVersionNoEmail'));
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
        setError(translateAuthError(authError, t));
        return;
      }
      setEmail(yvUserInfo.email as string);
      setMagicLinkSent(true);
    })();
  }, [yvAuthenticated, yvUserInfo, yvAuthError, signInWithMagicLink, t]);

  const handleSubmit = async () => {
    setError(null);
    setMagicLinkSent(false);
    setNeedsEmailConfirmation(false);

    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return;
    }

    if (!isValidEmail(email)) {
      setError(t('auth.emailInvalid'));
      return;
    }

    setSubmitting(true);
    try {
      if (method === 'magic_link') {
        const { error: authError } = await signInWithMagicLink(email.trim());
        if (authError) {
          setError(translateAuthError(authError, t));
        } else {
          setMagicLinkSent(true);
        }
        return;
      }

      if (!password) {
        setError(t('auth.passwordRequired'));
        return;
      }

      if (mode === 'sign_in') {
        const { error: authError } = await signInWithPassword(email.trim(), password);
        if (authError) {
          setError(translateAuthError(authError, t));
        }
        return;
      }

      const { error: authError, needsEmailConfirmation: shouldConfirm } = await signUpWithPassword(
        email.trim(),
        password,
      );

      if (authError) {
        setError(translateAuthError(authError, t));
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
          <FadeIn rise={16}>
            <View style={styles.mascotWrapper}>
              <View style={styles.mascotBackdrop} />
              <LumiMascot mood="normal" size={190} />
            </View>
          </FadeIn>
          <FadeIn delay={80} style={styles.titleBlock}>
            <Text style={[theme.typography.title, styles.centeredText]}>
              {t('auth.welcomeTitle')}
            </Text>
            <Text style={[theme.typography.body, styles.subtitle]}>
              {mode === 'sign_in' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
            </Text>
          </FadeIn>

          <Card style={styles.card}>
            <TextField
              label={t('common.email')}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {method === 'password' ? (
              <TextField
                label={t('common.password')}
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {magicLinkSent ? (
              <Text style={styles.successText}>{t('auth.magicLinkSent')}</Text>
            ) : null}
            {needsEmailConfirmation ? (
              <Text style={styles.successText}>{t('auth.signUpConfirmationSent')}</Text>
            ) : null}

            <Button
              label={
                method === 'magic_link'
                  ? t('auth.sendMagicLink')
                  : mode === 'sign_in'
                    ? t('auth.signIn')
                    : t('auth.signUp')
              }
              onPress={handleSubmit}
              disabled={submitting}
            />

            <Button
              variant="tertiary"
              label={method === 'password' ? t('auth.useMagicLink') : t('auth.usePassword')}
              onPress={() => {
                setMethod(method === 'password' ? 'magic_link' : 'password');
                setError(null);
                setMagicLinkSent(false);
              }}
            />

            {method === 'password' && mode === 'sign_in' ? (
              <Button
                variant="tertiary"
                label={t('auth.forgotPassword')}
                onPress={() => router.push('/(auth)/esqueci-senha')}
              />
            ) : null}
          </Card>

          {method === 'password' ? (
            <View style={styles.toggleRow}>
              <Text style={theme.typography.body}>
                {mode === 'sign_in' ? t('auth.noAccountYet') : t('auth.alreadyHaveAccount')}
              </Text>
              <Button
                variant="tertiary"
                label={mode === 'sign_in' ? t('auth.signUp') : t('auth.signIn')}
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
              label={t('auth.signInWithYouVersion')}
              onPress={handleYouVersionSignIn}
              disabled={submitting}
            />
            <Text style={[theme.typography.caption, styles.subtitle]}>
              {t('auth.youVersionHint')}
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      padding: 0,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 22,
      gap: theme.spacing.md,
    },
    mascotWrapper: {
      alignSelf: 'center',
      width: 190,
      height: 190,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    // Disco amarelo atrás do Lumi (mesmo recurso da tela Hoje): dá destaque ao mascote.
    mascotBackdrop: {
      position: 'absolute',
      bottom: 4,
      width: 168,
      height: 168,
      borderRadius: 84,
      backgroundColor: theme.colors.yellow,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      ...theme.shadow.card,
    },
    titleBlock: {
      gap: theme.spacing.xs,
    },
    centeredText: {
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.muted,
      textAlign: 'center',
    },
    card: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    errorText: {
      ...theme.typography.caption,
      color: '#E05252',
    },
    successText: {
      ...theme.typography.caption,
      color: theme.colors.ink,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
  });
