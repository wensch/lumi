import { SvgXml } from 'react-native-svg';
import { useTranslation } from '@/i18n';
import type { LumiMood } from '@/lib/supabase';
import { lumiSvgWithFace, type LumiFace } from './svgs/lumiFaces';
import { applyOutfit } from './outfits';
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

export function LumiMascot({ mood = 'normal', size = 160 }: LumiMascotProps) {
  const { t } = useTranslation();
  const { outfitId } = useLumiOutfit();
  return (
    <SvgXml
      xml={applyOutfit(lumiSvgWithFace(FACE_BY_VARIANT[mood]), outfitId)}
      width={size}
      height={size}
      accessibilityLabel={t('lumi.mascotLabel')}
    />
  );
}
