import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { useTheme, type Theme } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'tertiary';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
};

export function Button({ label, variant = 'primary', style, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles(theme)[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 18,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.button,
    },
    // Sombra dura reage ao toque com deslocamento, não opacidade — o botão
    // "afunda" na direção da sombra, como se estivesse sendo empurrado.
    pressed: {
      transform: [{ translateX: 3 }, { translateY: 3 }],
      ...theme.shadow.buttonPressed,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      ...theme.typography.button,
      color: theme.colors.ink,
    },
  });

const variantStyles = (theme: Theme) =>
  StyleSheet.create({
    primary: {
      backgroundColor: theme.colors.green,
    },
    secondary: {
      backgroundColor: theme.colors.blue,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderStyle: 'dashed',
      shadowOpacity: 0,
      elevation: 0,
    },
    // Ação de baixa ênfase (ex: "Voltar", cancelar) — sem borda nem sombra,
    // para não competir visualmente com a ação secundária real da tela.
    tertiary: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
  });
