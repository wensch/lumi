import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '@/theme';

type StepperProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
};

/** Escolha de um número com − e +. Os botões têm 48 pt (alvo de toque confortável). */
export function Stepper({ value, min, max, onChange, decreaseLabel, increaseLabel }: StepperProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const clamped = Math.min(Math.max(value, min), max);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(Math.max(min, clamped - 1))}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        disabled={clamped <= min}
        style={[styles.button, clamped <= min && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.value} accessibilityLiveRegion="polite">
        {clamped}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, clamped + 1))}
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        disabled={clamped >= max}
        style={[styles.button, clamped >= max && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    button: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
    },
    buttonDisabled: {
      opacity: 0.35,
    },
    buttonText: {
      ...theme.typography.heading,
    },
    value: {
      ...theme.typography.heading,
      minWidth: 48,
      textAlign: 'center',
    },
  });
