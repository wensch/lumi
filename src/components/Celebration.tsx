import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

/** Respeita "reduzir movimento" do sistema: sem confete nem molas, só o conteúdo aparecendo. */
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
  }, []);
  return reduce;
}

type PopInProps = {
  children: ReactNode;
  /** Atraso antes de entrar (ms) — escalone elementos de uma mesma tela. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/** Entrada "pulando": cresce de 60% a 100% com uma mola leve e aparece. */
export function PopIn({ children, delay = 0, style }: PopInProps) {
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: 1,
      delay: reduceMotion ? 0 : delay,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            {
              scale: reduceMotion
                ? 1
                : progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Sobe e desce devagar, sem parar — dá "vida" ao mascote na tela de conclusão. */
export function Bob({ children, amplitude = 6 }: { children: ReactNode; amplitude?: number }) {
  const reduceMotion = useReduceMotion();
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, reduceMotion]);

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Número que "sobe" de 0 até o valor (ex.: +10 XP). */
export function useCountUp(target: number, duration = 800) {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduceMotion || target <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- valor final direto quando não há animação
      setValue(target);
      return;
    }
    const progress = new Animated.Value(0);
    const id = progress.addListener(({ value: v }) => setValue(Math.round(v * target)));
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(() => setValue(target));
    return () => {
      animation.stop();
      progress.removeListener(id);
    };
  }, [target, duration, reduceMotion]);

  return value;
}

type ConfettiProps = {
  /** Quantidade de peças: ~14 para um momento comum, ~50 para marco/conquista. */
  count?: number;
};

type Piece = {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  colorIndex: number;
  round: boolean;
};

/** Chuva de confete de uma vez só (não repete), por cima da tela e sem bloquear toques. */
export function Confetti({ count = 14 }: ConfettiProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: count }, () => ({
      left: Math.random(),
      size: 8 + Math.random() * 9,
      delay: Math.random() * 0.35,
      duration: 0.65 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 90,
      spin: 360 + Math.random() * 540,
      colorIndex: Math.floor(Math.random() * 5),
      round: Math.random() > 0.55,
    })),
  );

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      delay: 250,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  if (reduceMotion) return null;

  const colors = [
    theme.colors.green,
    theme.colors.blue,
    theme.colors.pink,
    theme.colors.white,
    theme.colors.yellow,
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      {pieces.map((piece, index) => {
        // Cada peça ocupa uma janela [delay, delay + duration] do progresso global (0..1).
        const start = piece.delay;
        const end = Math.min(1, piece.delay + piece.duration);
        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              top: -20,
              left: piece.left * (width - piece.size),
              width: piece.size,
              height: piece.size * (piece.round ? 1 : 1.6),
              borderRadius: piece.round ? piece.size : 3,
              backgroundColor: colors[piece.colorIndex],
              borderWidth: 1.5,
              borderColor: theme.colors.ink,
              opacity: progress.interpolate({
                inputRange: [0, start, start + 0.02, Math.max(start + 0.03, end - 0.1), end],
                outputRange: [0, 0, 1, 1, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [start, end],
                    outputRange: [0, height + 40],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  translateX: progress.interpolate({
                    inputRange: [start, end],
                    outputRange: [0, piece.drift],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [start, end],
                    outputRange: ['0deg', `${piece.spin}deg`],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
