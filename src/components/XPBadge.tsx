import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type XPBadgeProps = {
  xp: number;
};

/** XP mede constância comportamental, nunca espiritualidade (briefing §7.1). */
export function XPBadge({ xp }: XPBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⭐</Text>
      <Text style={styles.value}>{xp} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.yellow,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 16,
  },
  value: {
    ...typography.bodyStrong,
    color: colors.ink,
  },
});
