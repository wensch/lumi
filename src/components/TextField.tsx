import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme, type Theme } from '@/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={theme.colors.muted}
        accessibilityLabel={label}
        // Campos de texto livre (reflexão, pergunta, oração) pedem maiúscula no início das frases;
        // email/senha continuam sem.
        autoCapitalize={rest.multiline ? 'sentences' : 'none'}
        textAlignVertical={rest.multiline ? 'top' : 'center'}
        keyboardAppearance={theme.palette.isDark ? 'dark' : 'light'}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.ink,
    },
    input: {
      ...theme.typography.body,
      color: theme.colors.ink,
      backgroundColor: theme.colors.bg,
      borderRadius: 16,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger,
    },
  });
