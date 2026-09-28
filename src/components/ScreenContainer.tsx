import { SafeAreaView, StyleSheet, type ViewProps } from 'react-native';
import { useTheme, type Theme } from '@/theme';

/**
 * Casca da tela: só fundo + safe area. Não define padding nem gap —
 * cada tela decide isso no seu próprio conteúdo (View estática simples
 * ou ScrollView com contentContainerStyle), porque as duas abordagens
 * não compõem bem com um gap herdado do container pai. Ver Section para
 * o padrão recomendado de espaçamento vertical entre blocos.
 */
export function ScreenContainer({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return <SafeAreaView style={[styles.container, style]} {...rest} />;
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
  });
