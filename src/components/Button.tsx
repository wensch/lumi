import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
};

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
      <Text style={[styles.label, variant === 'ghost' && styles.labelGhost]}>{label}</Text>
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
  labelGhost: {
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
});
