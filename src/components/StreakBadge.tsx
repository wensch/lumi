import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type StreakBadgeProps = {
  days: number;
};

/** Contabiliza constância comportamental — nunca "nível espiritual". */
export function StreakBadge({ days }: StreakBadgeProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔥</Text>
      <Text style={styles.value}>
        {days} {t(days === 1 ? 'home.day' : 'home.days')}
      </Text>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.white,
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
