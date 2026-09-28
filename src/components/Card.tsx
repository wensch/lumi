import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme, type Theme } from '@/theme';

type CardProps = ViewProps & {
  /** 'default' para blocos de conteúdo, 'compact' para elementos menores (linha de lista, badge). */
  padding?: 'default' | 'compact';
};

export function Card({ style, padding = 'default', ...rest }: CardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return <View style={[styles.card, padding === 'compact' && styles.compact, style]} {...rest} />;
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.radius.lg,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      padding: theme.spacing.lg,
      ...theme.shadow.card,
    },
    compact: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
    },
  });
