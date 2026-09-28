import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, Card, Screen, TextField } from '@/components';
import { useAuth } from '@/features/auth';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';

/**
 * Alvo do link de "esqueci minha senha", depois que useAuthDeepLink
 * detecta type=recovery no fragment e RootNavigation redireciona pra cá
 * (tem prioridade sobre onboarding/tabs enquanto isPasswordRecovery for
 * true). Ao salvar com sucesso, updatePassword zera isPasswordRecovery e
 * RootNavigation volta a decidir a rota normalmente.
 */
export default function NovaSenhaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (updateError) {
      setError('Não foi possível salvar a nova senha. Tenta de novo.');
    }
  };

  return (
    <Screen centered contentContainerStyle={styles.content}>
      <LumiMascot mood="normal" size={120} />
      <Text style={[theme.typography.title, styles.title]}>Nova senha</Text>
      <Text style={[theme.typography.body, styles.subtitle]}>
        Escolha uma nova senha para sua conta.
      </Text>

      <Card style={styles.card}>
        <TextField
          label="Nova senha"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextField
          label="Confirmar nova senha"
          placeholder="••••••••"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={submitting ? 'Salvando...' : 'Salvar nova senha'}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </Card>
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
  });
