import { SafeAreaView, StyleSheet, type ViewProps } from 'react-native';
import { semanticColors } from '@/theme';

/**
 * Casca da tela: só fundo + safe area. Não define padding nem gap —
 * cada tela decide isso no seu próprio conteúdo (View estática simples
 * ou ScrollView com contentContainerStyle), porque as duas abordagens
 * não compõem bem com um gap herdado do container pai. Ver Section para
 * o padrão recomendado de espaçamento vertical entre blocos.
 */
export function ScreenContainer({ style, ...rest }: ViewProps) {
  return <SafeAreaView style={[styles.container, style]} {...rest} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semanticColors.background,
  },
});
