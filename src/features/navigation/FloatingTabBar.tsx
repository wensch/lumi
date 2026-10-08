import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '@/theme';

const ICON_BY_ROUTE: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'sunny',
  biblia: 'book',
  lumi: 'paw',
  circulos: 'people',
  perfil: 'person-circle',
};

/**
 * Tab bar flutuante custom (protótipo "Recorte"): left/right 14, bottom
 * 16, fundo branco, borda 2.5, sombra dura, raio 26. Aba ativa ganha
 * fundo verde + borda ink. A tab bar nativa do React Navigation não
 * suporta esse visual "pill ativa" via tabBarStyle — precisa de um
 * componente de tabBar totalmente customizado.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  // Com 5 abas o botão perde o respiro lateral para o rótulo caber em telas de ~360dp.
  const compact = state.routes.length > 4;

  return (
    <View style={[styles.container, { bottom: 16 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const isFocused = state.index === index;
        const iconName = ICON_BY_ROUTE[route.name] ?? 'ellipse';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            style={[styles.tab, compact && styles.tabCompact, isFocused && styles.tabActive]}
          >
            <Ionicons name={iconName} size={22} color={theme.colors.ink} />
            <Text style={styles.label} maxFontSizeMultiplier={1.25}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 16,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: 26,
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
      paddingHorizontal: 6,
      ...theme.shadow.button,
    },
    tab: {
      alignItems: 'center',
      gap: 2,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    tabCompact: {
      paddingHorizontal: 8,
    },
    tabActive: {
      backgroundColor: theme.colors.green,
      borderColor: theme.colors.ink,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.ink,
      fontSize: 12,
    },
  });
