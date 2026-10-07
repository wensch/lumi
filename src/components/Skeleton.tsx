import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bloco cinza pulsante que ocupa o lugar de um conteúdo ainda não
 * carregado. Pulsa em opacidade com o driver nativo (barato mesmo com
 * vários na tela).
 */
export function Skeleton({ width = '100%', height = 16, radius = 10, style }: SkeletonProps) {
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.ink,
          opacity: pulse.interpolate({ inputRange: [0.45, 1], outputRange: [0.07, 0.15] }),
        },
        style,
      ]}
    />
  );
}
