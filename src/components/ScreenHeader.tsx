import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type ScreenHeaderProps = {
  title: string;
  /** Mostra o botão circular de voltar à esquerda (telas empilhadas, como Configurações). */
  onBackPress?: () => void;
  /** Padrão: abre Configurações. Telas com botão de voltar não mostram o de configurações. */
  onSettingsPress?: () => void;
};

/**
 * Título de tela (40px, peso 800) + botão circular — padrão repetido em
 * Bíblia/Lumi/Perfil (configurações) e Configurações (voltar). O título
 * encolhe em vez de cortar o botão em idiomas/fontes maiores.
 */
export function ScreenHeader({ title, onBackPress, onSettingsPress }: ScreenHeaderProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {onBackPress ? (
        <Pressable
          onPress={onBackPress}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          style={styles.circleButton}
        >
          <Ionicons name="chevron-back" size={30} color={theme.colors.ink} />
        </Pressable>
      ) : null}
      <Text
        style={[theme.typography.display, styles.title]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {title}
      </Text>
      {onBackPress ? null : (
        <Pressable
          onPress={onSettingsPress ?? (() => router.push('/configuracoes'))}
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          hitSlop={8}
          style={styles.circleButton}
        >
          <Ionicons name="settings-outline" size={22} color={theme.colors.ink} />
        </Pressable>
      )}
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      color: theme.colors.ink,
    },
    circleButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
