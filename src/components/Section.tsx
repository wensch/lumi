import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { Card } from './Card';
import { colors, spacing, typography } from '@/theme';

type SectionProps = ViewProps & {
  /** Rótulo curto do bloco (ex: "Aplicação", "Desafio"). Sentence case, não all-caps — ver frontend-design. */
  label?: string;
  /** Envolve o conteúdo num Card (fundo branco, sombra). Desliga para blocos que não precisam de cartão próprio. */
  card?: boolean;
};

/**
 * Bloco de conteúdo com rótulo opcional. Existe para parar de duplicar o
 * par "Text de label + Text de corpo" tela por tela com espaçamento
 * ad-hoc — cada tela que tinha isso (devocional, perfil) tratava o
 * espaçamento de um jeito ligeiramente diferente, o que é o que causava
 * a sensação de proporção inconsistente entre telas.
 */
export function Section({ label, card = true, style, children, ...rest }: SectionProps) {
  const content = (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
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

const styles = StyleSheet.create({
  label: {
    ...typography.bodyStrong,
    color: colors.greenDark,
    marginBottom: spacing.xs,
  },
});
