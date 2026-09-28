import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'tertiary';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
};

const LIGHT_LABEL_VARIANTS: ButtonVariant[] = ['ghost', 'tertiary'];

export function Button({ label, variant = 'primary', style, disabled, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, LIGHT_LABEL_VARIANTS.includes(variant) && styles.labelLight]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.bodyStrong,
    color: colors.white,
  },
  labelLight: {
    color: colors.greenDark,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.greenPrimary,
  },
  secondary: {
    backgroundColor: colors.blue,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.greenPrimary,
  },
  // Ação de baixa ênfase (ex: "Voltar", cancelar) — sem borda, para não
  // competir visualmente com a ação secundária real da mesma tela.
  tertiary: {
    backgroundColor: 'transparent',
  },
});
