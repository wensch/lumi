import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LumiMascot } from '@/features/lumi';
import { colors, radius, spacing, typography } from '@/theme';

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
  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>🔥</Text>
        <Text style={styles.streakValue}>{streak}</Text>
        <Text style={styles.streakLabel}>{streak === 1 ? 'dia seguido' : 'dias seguidos'}</Text>
      </View>

      <LumiMascot mood="celebrating" size={320} />

      <Text style={styles.title}>Constância em dia</Text>
      <Text style={styles.subtitle}>{totalXp} XP acumulado com o Lumi</Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Projeto Lumi</Text>
      </View>
    </View>
  );
});

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  badgeIcon: {
    fontSize: 48,
  },
  streakValue: {
    ...typography.title,
    fontSize: 56,
    color: colors.ink,
  },
  streakLabel: {
    ...typography.heading,
    color: colors.ink,
  },
  title: {
    ...typography.title,
    fontSize: 48,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.heading,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
  },
  footerText: {
    ...typography.bodyStrong,
    color: colors.white,
    opacity: 0.85,
  },
});
