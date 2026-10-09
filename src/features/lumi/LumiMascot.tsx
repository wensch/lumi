import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { useTranslation } from '@/i18n';
import type { LumiMood } from '@/lib/supabase';
import { lumiSvgWithFace, type LumiFace } from './svgs/lumiFaces';
import { applyOutfits, motionFor, type OutfitMotion } from './outfits';
import { useLumiOutfit } from './LumiOutfitProvider';

/** Variantes visuais: `normal` usa o rosto feliz e `missing_you` o triste; as demais têm rosto próprio. */
export type LumiMoodVariant =
  'normal' | 'missing_you' | Exclude<LumiFace, 'happy' | 'sad'> | 'happy';

const FACE_BY_VARIANT: Record<LumiMoodVariant, LumiFace> = {
  normal: 'happy',
  happy: 'happy',
  celebrating: 'celebrating',
  proud: 'proud',
  waiting: 'waiting',
  thoughtful: 'thoughtful',
  determined: 'determined',
  sassy: 'sassy',
  surprised: 'surprised',
  suspicious: 'suspicious',
  sleepy: 'sleepy',
  missing_you: 'sad',
};

/** lumi_state.mood (13 valores, briefing §8.6) -> expressão do mascote. */
const VARIANT_BY_MOOD: Record<LumiMood, LumiMoodVariant> = {
  normal: 'normal',
  happy: 'happy',
  celebrating: 'celebrating',
  proud: 'proud',
  surprised: 'surprised',
  waiting: 'waiting',
  determined: 'determined',
  thoughtful: 'thoughtful',
  sassy: 'sassy',
  suspicious: 'suspicious',
  sleepy: 'sleepy',
  missing_you: 'missing_you',
  sad: 'missing_you',
};

export function lumiMoodToVariant(mood: LumiMood): LumiMoodVariant {
  return VARIANT_BY_MOOD[mood] ?? 'normal';
}

type LumiMascotProps = {
  mood?: LumiMoodVariant;
  size?: number;
};

const MOTION_DURATION: Record<OutfitMotion, number> = { sway: 2600, float: 2200, pulse: 1800 };

/** Movimento contínuo e leve (só com itens especiais); sem "reduzir movimento" ativo. */
function useMascotMotion(motion: OutfitMotion | null) {
  const reduceMotion = useReduceMotion();
  const [phase] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!motion || reduceMotion) return;
    const duration = MOTION_DURATION[motion];
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      phase.setValue(0);
    };
  }, [motion, reduceMotion, phase]);

  if (!motion || reduceMotion) return undefined;
  switch (motion) {
    case 'sway':
      return {
        transform: [
          { rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['-2.5deg', '2.5deg'] }) },
        ],
      };
    case 'float':
      return {
        transform: [
          { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
        ],
      };
    case 'pulse':
      return {
        transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
      };
  }
}

export function LumiMascot({ mood = 'normal', size = 160 }: LumiMascotProps) {
  const { t } = useTranslation();
  const { outfitIds } = useLumiOutfit();
  const motionStyle = useMascotMotion(motionFor(outfitIds));
  return (
    <Animated.View style={motionStyle}>
      <SvgXml
        xml={applyOutfits(lumiSvgWithFace(FACE_BY_VARIANT[mood]), outfitIds)}
        width={size}
        height={size}
        accessibilityLabel={t('lumi.mascotLabel')}
      />
    </Animated.View>
  );
}
