import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { useTheme, type Theme } from '@/theme';

type ScreenProps = ViewProps & {
  /** Envolve o conteúdo em ScrollView quando a tela pode exceder a viewport (padrão: true). */
  scroll?: boolean;
  /** Centraliza o conteúdo verticalmente — para telas curtas de estado único (loading, erro, sucesso). */
  centered?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

/**
 * Casca de tela padrão: fundo + safe area (ScreenContainer) + padding
 * horizontal consistente + espaçamento vertical entre filhos diretos via
 * gap. Substitui o padrão antigo de cada tela montar sua própria
 * combinação de ScreenContainer/ScrollView/estilos de padding — eram a
 * causa mais comum de proporção inconsistente entre telas.
 */
export function Screen({
  scroll = true,
  centered = false,
  style,
  contentContainerStyle,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (!scroll) {
    return (
      <ScreenContainer>
        <View style={[styles.content, centered && styles.centered, style]} {...rest}>
          {children}
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          styles.scrollContent,
          centered && styles.centered,
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </ScreenContainer>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 22,
      gap: theme.spacing.md,
    },
    scrollContent: {
      paddingTop: theme.spacing.lg,
      paddingBottom: 130,
      flexGrow: 1,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'stretch',
    },
  });
