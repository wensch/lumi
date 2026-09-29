import { StyleSheet, Text } from 'react-native';
import { Button } from '@/components';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
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
  const { t } = useTranslation();
  const { cardRef, share, sharing, error } = useShareStreak();

  return (
    <>
      <Button
        variant="secondary"
        label={sharing ? t('share.preparing') : t('share.share')}
        disabled={sharing}
        onPress={share}
        accessibilityHint={t('share.shareHint')}
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
