import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/theme';

type CardProps = ViewProps & {
  /** 'default' para blocos de conteúdo, 'compact' para elementos menores (linha de lista, badge). */
  padding?: 'default' | 'compact';
};

export function Card({ style, padding = 'default', ...rest }: CardProps) {
  return <View style={[styles.card, padding === 'compact' && styles.compact, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  compact: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
