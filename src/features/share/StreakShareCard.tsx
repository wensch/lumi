import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type StreakShareCardProps = {
  streak: number;
  totalXp: number;
};

/**
 * Card 1080x1920 (proporção de story) capturado via react-native-view-shot
 * para compartilhamento. Fica fora da área visível (posição absoluta,
 * atrás do conteúdo real) e só é renderizado quando useShareStreak precisa
 * capturá-lo — ver comentário em useShareStreak.ts.
 */
export const StreakShareCard = forwardRef<View, StreakShareCardProps>(function StreakShareCard(
  { streak, totalXp },
  ref,
) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>🔥</Text>
        <Text style={styles.streakValue}>{streak}</Text>
        <Text style={styles.streakLabel}>
          {t(streak === 1 ? 'share.streakOneDay' : 'share.streakManyDays')}
        </Text>
      </View>

      <LumiMascot mood="celebrating" size={320} />

      <Text style={styles.title}>{t('share.title')}</Text>
      <Text style={styles.subtitle}>{t('share.subtitle', { xp: totalXp })}</Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('share.footer')}</Text>
      </View>
    </View>
  );
});

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      backgroundColor: theme.colors.green,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xxl,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderWidth: 4,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    badgeIcon: {
      fontSize: 48,
    },
    streakValue: {
      ...theme.typography.title,
      fontSize: 56,
      color: theme.colors.ink,
    },
    streakLabel: {
      ...theme.typography.heading,
      color: theme.colors.ink,
    },
    title: {
      ...theme.typography.title,
      fontSize: 48,
      color: theme.colors.ink,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.heading,
      color: theme.colors.ink,
      textAlign: 'center',
      opacity: 0.85,
    },
    footer: {
      position: 'absolute',
      bottom: theme.spacing.xxl,
    },
    footerText: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
      opacity: 0.85,
    },
  });
