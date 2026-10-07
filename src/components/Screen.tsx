import type { Ref } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeIn } from './FadeIn';
import { ScreenContainer } from './ScreenContainer';
import { useTheme, type Theme } from '@/theme';

type ScreenProps = ViewProps & {
  /** Envolve o conteúdo em ScrollView quando a tela pode exceder a viewport (padrão: true). */
  scroll?: boolean;
  /** Centraliza o conteúdo verticalmente — para telas curtas de estado único (loading, erro, sucesso). */
  centered?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** Ref do ScrollView interno, para telas que precisam rolar até um ponto (ex.: versículo achado). */
  scrollRef?: Ref<ScrollView>;
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
  scrollRef,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  if (!scroll) {
    return (
      <ScreenContainer>
        <FadeIn rise={0} style={styles.fill}>
          <View style={[styles.content, centered && styles.centered, style]} {...rest}>
            {children}
          </View>
        </FadeIn>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FadeIn rise={0} style={styles.fill}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            styles.scrollContent,
            { paddingBottom: 130 + insets.bottom },
            centered && styles.centered,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </FadeIn>
    </ScreenContainer>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 22,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    scrollContent: {
      paddingTop: theme.spacing.xl,
      paddingBottom: 130,
      flexGrow: 1,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'stretch',
    },
  });
