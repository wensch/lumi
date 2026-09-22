import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type StreakBadgeProps = {
  days: number;
};

/** Contabiliza constância comportamental — nunca "nível espiritual". */
export function StreakBadge({ days }: StreakBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.value}>{days}</Text>
      <Text style={styles.label}>{days === 1 ? 'dia' : 'dias'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
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
  label: {
    ...typography.caption,
    color: colors.ink,
  },
});
