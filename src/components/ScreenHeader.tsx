import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/theme';

type ScreenHeaderProps = {
  title: string;
  onSettingsPress?: () => void;
};

/** Título de tela (40px, peso 800) + botão de configurações circular — padrão repetido em Bíblia/Lumi/Perfil. */
export function ScreenHeader({ title, onSettingsPress }: ScreenHeaderProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={[theme.typography.display, styles.title]}>{title}</Text>
      <Pressable
        onPress={onSettingsPress}
        accessibilityRole="button"
        accessibilityLabel="Configurações"
        style={styles.settingsButton}
      >
        <Ionicons name="settings-outline" size={18} color={theme.colors.ink} />
      </Pressable>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      color: theme.colors.ink,
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
