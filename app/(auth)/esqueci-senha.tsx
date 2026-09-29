import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, TextField } from '@/components';
import { isValidEmail, useAuth } from '@/features/auth';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function EsqueciSenhaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return;
    }

    if (!isValidEmail(email)) {
      setError(t('auth.emailInvalid'));
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await sendPasswordReset(email.trim());
    setSubmitting(false);

    if (resetError) {
      setError(t('forgotPassword.genericError'));
      return;
    }

    setSent(true);
  };

  return (
    <Screen centered contentContainerStyle={styles.content}>
      <LumiMascot mood="waiting" size={120} />
      <Text style={[theme.typography.title, styles.title]}>{t('forgotPassword.title')}</Text>
      <Text style={[theme.typography.body, styles.subtitle]}>{t('forgotPassword.subtitle')}</Text>

      <Card style={styles.card}>
        <TextField
          label={t('common.email')}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {sent ? <Text style={styles.successText}>{t('forgotPassword.sent')}</Text> : null}

        <Button
          label={submitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </Card>

      <Button variant="tertiary" label={t('common.back')} onPress={() => router.back()} />
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
