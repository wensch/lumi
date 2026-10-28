import { StyleSheet, Text, View } from 'react-native';
import { LumiMascot, type Outfit } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type Props = {
  outfit: Outfit;
  /** Já conquistada (o desafio já foi concluído antes). */
  earned: boolean;
};

/** "Recompensa": o Lumi vestindo o item que o desafio dá, com o nome e se já foi conquistado. */
export function ChallengeReward({ outfit, earned }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const name = t(`lumi.outfits.${outfit.id}`);
  const status = earned ? t('challenges.rewardEarned') : t('challenges.rewardOnComplete');

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('challenges.rewardLabel', { name, status })}
    >
      <View style={styles.mascot}>
        <LumiMascot size={60} outfits={[outfit.id]} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.caption}>{t('challenges.reward')}</Text>
        <Text style={theme.typography.bodyStrong}>{name}</Text>
        <Text style={[theme.typography.caption, earned ? styles.earned : styles.pending]}>
          {status}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    mascot: {
      width: 60,
      height: 60,
    },
    texts: {
      flex: 1,
      gap: 1,
    },
    caption: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    earned: {
      color: theme.colors.ink,
      fontFamily: theme.typography.bodyStrong.fontFamily,
    },
    pending: {
      color: theme.colors.muted,
    },
  });
