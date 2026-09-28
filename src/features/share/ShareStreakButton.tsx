import { StyleSheet, Text } from 'react-native';
import { Button } from '@/components';
import { useTheme, type Theme } from '@/theme';
import { useShareStreak } from './useShareStreak';
import { OffscreenShareCard } from './OffscreenShareCard';

type ShareStreakButtonProps = {
  streak: number;
  totalXp: number;
};

/** Botão "Compartilhar" estilo Duolingo: gera um card do streak e abre o menu nativo de compartilhamento. */
export function ShareStreakButton({ streak, totalXp }: ShareStreakButtonProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { cardRef, share, sharing, error } = useShareStreak();

  return (
    <>
      <Button
        variant="secondary"
        label={sharing ? 'Preparando...' : 'Compartilhar'}
        disabled={sharing}
        onPress={share}
        accessibilityHint="Gera uma imagem da sua sequência atual para compartilhar"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <OffscreenShareCard ref={cardRef} streak={streak} totalXp={totalXp} />
    </>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    error: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    },
  });
