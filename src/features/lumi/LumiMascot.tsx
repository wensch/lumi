import { Image, type ImageSourcePropType } from 'react-native';
import type { LumiMood } from '@/lib/supabase';

export type LumiMoodVariant = 'normal' | 'happy' | 'celebrating' | 'waiting' | 'missing_you';

const VARIANT_BY_MOOD: Record<LumiMood, LumiMoodVariant> = {
  normal: 'normal',
  happy: 'happy',
  celebrating: 'celebrating',
  proud: 'happy',
  surprised: 'happy',
  waiting: 'waiting',
  determined: 'waiting',
  thoughtful: 'waiting',
  sassy: 'normal',
  suspicious: 'normal',
  sleepy: 'normal',
  missing_you: 'missing_you',
  sad: 'missing_you',
};

/**
 * lumi_state.mood tem 13 valores (briefing §8.6); LumiMascot cobre 5
 * variantes visuais (normal, happy, celebrating, waiting, missing_you —
 * as acionadas pelo MVP). Mapeia os demais para a mais próxima até a
 * Fase 2 expandir a ilustração para o conjunto completo.
 */
export function lumiMoodToVariant(mood: LumiMood): LumiMoodVariant {
  return VARIANT_BY_MOOD[mood] ?? 'normal';
}

type LumiMascotProps = {
  mood?: LumiMoodVariant;
  size?: number;
};

/**
 * Arte oficial do Lumi (ilustrado, fundo transparente, 512x512 fonte).
 * Mapeamento aproximado — a arte ainda não cobre 1:1 as 5 variantes do
 * MVP: "celebrating" reaproveita a imagem feliz (a mais festiva
 * disponível) e "waiting" reaproveita a expressão neutra/séria, até
 * termos ilustrações dedicadas para esses dois estados.
 */
const IMAGE_BY_VARIANT: Record<LumiMoodVariant, ImageSourcePropType> = {
  normal: require('../../../assets/lumi/lumi-sassy.png'),
  happy: require('../../../assets/lumi/lumi-happy.png'),
  celebrating: require('../../../assets/lumi/lumi-happy.png'),
  waiting: require('../../../assets/lumi/lumi-sassy.png'),
  missing_you: require('../../../assets/lumi/lumi-sad.png'),
};

export function LumiMascot({ mood = 'normal', size = 160 }: LumiMascotProps) {
  return (
    <Image
      source={IMAGE_BY_VARIANT[mood]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel={`Lumi — estado ${mood}`}
    />
  );
}
