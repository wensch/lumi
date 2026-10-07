import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

type FadeInProps = {
  children: ReactNode;
  /** Atraso antes de começar — use múltiplos de ~60ms para escalonar blocos de uma mesma tela. */
  delay?: number;
  /** Deslocamento vertical inicial em px (0 = só opacidade). */
  rise?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Entrada suave (opacidade + leve subida) ao montar. Usa o Animated nativo
 * do React Native com driver nativo — sem dependência de Reanimated. Pula a
 * animação quando o usuário pediu "reduzir movimento" no sistema.
 */
export function FadeIn({ children, delay = 0, rise = 12, duration = 320, style }: FadeInProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          progress.setValue(1);
          return;
        }
        animation = Animated.timing(progress, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      });

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [progress, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
