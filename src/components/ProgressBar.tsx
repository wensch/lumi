import { StyleSheet, View } from 'react-native';
import { useTheme, type Theme } from '@/theme';

type ProgressBarProps = {
  /** De 0 a 1. */
  progress: number;
  /** Texto lido pelo leitor de tela (ex.: "Dia 3 de 7"). */
  accessibilityLabel?: string;
};

/** Barra de progresso simples (trilho com borda e preenchimento verde). */
export function ProgressBar({ progress, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const clamped = Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), 1);

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={[styles.fill, { width: `${Math.round(clamped * 100)}%` }]} />
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      height: 16,
      borderRadius: 8,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: theme.colors.green,
    },
  });
