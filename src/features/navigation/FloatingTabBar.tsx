import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import type { ComponentType } from 'react';
import type { IconProps } from 'phosphor-react-native';
import { BookOpen } from 'phosphor-react-native/src/icons/BookOpen';
import { Compass } from 'phosphor-react-native/src/icons/Compass';
import { Sun } from 'phosphor-react-native/src/icons/Sun';
import { UserCircle } from 'phosphor-react-native/src/icons/UserCircle';
import { UsersThree } from 'phosphor-react-native/src/icons/UsersThree';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '@/theme';

const ICON_BY_ROUTE: Record<string, ComponentType<IconProps>> = {
  index: Sun,
  biblia: BookOpen,
  jornada: Compass,
  circulos: UsersThree,
  perfil: UserCircle,
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
        const TabIcon = ICON_BY_ROUTE[route.name] ?? Sun;

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
            accessibilityLabel={
              options.tabBarBadge ? `${label}, ${String(options.tabBarBadge)}` : label
            }
            accessibilityState={isFocused ? { selected: true } : {}}
            style={[styles.tab, compact && styles.tabCompact, isFocused && styles.tabActive]}
          >
            <View>
              <TabIcon size={24} color={theme.colors.ink} weight={isFocused ? 'fill' : 'regular'} />
              {options.tabBarBadge ? (
                <View style={styles.badge} accessibilityElementsHidden>
                  <Text style={styles.badgeText} maxFontSizeMultiplier={1}>
                    {Number(options.tabBarBadge) > 9 ? '9+' : String(options.tabBarBadge)}
                  </Text>
                </View>
              ) : null}
            </View>
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
    badge: {
      position: 'absolute',
      top: -5,
      right: -9,
      minWidth: 17,
      height: 17,
      paddingHorizontal: 3,
      borderRadius: 9,
      backgroundColor: theme.colors.danger,
      borderWidth: 1.5,
      borderColor: theme.colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: theme.colors.white,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
    },
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
