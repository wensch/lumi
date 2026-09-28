import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/theme';

type XPBadgeProps = {
  xp: number;
};

/** XP mede constância comportamental, nunca espiritualidade (briefing §7.1). */
export function XPBadge({ xp }: XPBadgeProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⭐</Text>
      <Text style={styles.value}>{xp} XP</Text>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.yellow,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 5,
      paddingHorizontal: 14,
      alignSelf: 'flex-start',
      ...theme.shadow.chip,
    },
    icon: {
      fontSize: 16,
    },
    value: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
  });
