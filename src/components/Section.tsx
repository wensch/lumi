import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { Card } from './Card';
import { useTheme, type Theme } from '@/theme';

type SectionProps = ViewProps & {
  /** Rótulo curto do bloco (ex: "Aplicação", "Desafio"). Sentence case, não all-caps — ver frontend-design. */
  label?: string;
  /** Envolve o conteúdo num Card (fundo branco, sombra). Desliga para blocos que não precisam de cartão próprio. */
  card?: boolean;
  /** Rótulo como pílula com borda, em vez de texto simples — usado nos passos do devocional. */
  pillLabel?: boolean;
};

/**
 * Bloco de conteúdo com rótulo opcional. Existe para parar de duplicar o
 * par "Text de label + Text de corpo" tela por tela com espaçamento
 * ad-hoc — cada tela que tinha isso (devocional, perfil) tratava o
 * espaçamento de um jeito ligeiramente diferente, o que é o que causava
 * a sensação de proporção inconsistente entre telas.
 */
export function Section({
  label,
  card = true,
  pillLabel = false,
  style,
  children,
  ...rest
}: SectionProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const content = (
    <>
      {label ? <Text style={pillLabel ? styles.pillLabel : styles.label}>{label}</Text> : null}
      {children}
    </>
  );

  if (!card) {
    return (
      <View style={style} {...rest}>
        {content}
      </View>
    );
  }

  return (
    <Card style={style} {...rest}>
      {content}
    </Card>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    label: {
      ...theme.typography.bodyStrong,
      color: theme.colors.muted,
      marginBottom: theme.spacing.xs,
    },
    pillLabel: {
      ...theme.typography.label,
      color: theme.colors.ink,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.green,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 14,
      marginBottom: theme.spacing.sm,
    },
  });
