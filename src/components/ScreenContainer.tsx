import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '@/theme';

/**
 * Casca da tela: fundo + respiro do topo. Não define padding horizontal nem
 * gap — cada tela decide isso no seu próprio conteúdo (View estática simples
 * ou ScrollView com contentContainerStyle), porque as duas abordagens não
 * compõem bem com um gap herdado do container pai. Ver Section para o padrão
 * recomendado de espaçamento vertical entre blocos.
 *
 * O topo usa a área segura real (useSafeAreaInsets): o SafeAreaView do React
 * Native não faz nada no Android, e com a barra de status transparente o
 * conteúdo ficava colado nela.
 */
export function ScreenContainer({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme);
  return <View style={[styles.container, { paddingTop: insets.top }, style]} {...rest} />;
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
  });
