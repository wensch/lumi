import { SafeAreaView, StyleSheet, type ViewProps } from 'react-native';
import { semanticColors, spacing } from '@/theme';

export function ScreenContainer({ style, ...rest }: ViewProps) {
  return <SafeAreaView style={[styles.container, style]} {...rest} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semanticColors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
