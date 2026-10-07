import { SvgXml } from 'react-native-svg';
import { useTranslation } from '@/i18n';
import type { LumiMood } from '@/lib/supabase';
import { lumiHappySvg } from './svgs/lumiHappySvg';
import { lumiSadSvg } from './svgs/lumiSadSvg';

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
 * Redesign "Recorte": só 2 ilustrações (feliz/triste) cobrindo as 5
 * variantes do MVP — normal, celebrating e waiting reaproveitam a
 * expressão feliz (a mais neutra/acolhedora disponível), missing_you usa
 * a triste, até termos ilustrações dedicadas por estado.
 */
const SVG_BY_VARIANT: Record<LumiMoodVariant, string> = {
  normal: lumiHappySvg,
  happy: lumiHappySvg,
  celebrating: lumiHappySvg,
  waiting: lumiHappySvg,
  missing_you: lumiSadSvg,
};

export function LumiMascot({ mood = 'normal', size = 160 }: LumiMascotProps) {
  const { t } = useTranslation();
  return (
    <SvgXml
      xml={SVG_BY_VARIANT[mood]}
      width={size}
      height={size}
      accessibilityLabel={t('lumi.mascotLabel')}
    />
  );
}
