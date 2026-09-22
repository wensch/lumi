import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '@/theme';
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
 * PLACEHOLDER — ilustração vetorial provisória do Lumi (cordeiro 2D flat,
 * contorno grosso, sem auréola/cruz, briefing §8.5), desenhada em código
 * na ausência de gerador de imagem. A arte final está sendo produzida à
 * parte; ao chegar, substituir aqui mantendo a mesma API (mood, size).
 * Estados cobertos: normal, happy, celebrating, waiting, missing_you.
 */
export function LumiMascot({ mood = 'normal', size = 160 }: LumiMascotProps) {
  const ink = colors.ink;

  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* sombra de contato */}
      <Ellipse cx="80" cy="148" rx="34" ry="6" fill={ink} opacity={0.08} />

      {/* confete — só no estado comemorando */}
      {mood === 'celebrating' ? (
        <>
          <Circle cx="24" cy="40" r="4" fill={colors.yellow} />
          <Circle cx="136" cy="36" r="3" fill={colors.blue} />
          <Circle cx="30" cy="70" r="3" fill={colors.greenPrimary} />
          <Circle cx="132" cy="66" r="4" fill={colors.yellow} />
          <Path d="M20 90 L26 96" stroke={colors.blue} strokeWidth={3} strokeLinecap="round" />
          <Path d="M140 90 L134 96" stroke={colors.yellow} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : null}

      {/* pernas */}
      <Path
        d="M56 118 L54 140 Q54 144 58 144 L64 144 Q68 144 68 140 L68 118 Z"
        fill={colors.white}
        stroke={ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path
        d="M92 118 L90 140 Q90 144 94 144 L100 144 Q104 144 104 140 L104 118 Z"
        fill={colors.white}
        stroke={ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* corpo (lã, formas de nuvem arredondadas) */}
      <Path
        d="M40 98
           Q30 98 30 86
           Q30 76 40 74
           Q38 62 50 58
           Q56 48 68 50
           Q76 40 90 46
           Q102 42 110 52
           Q122 52 124 64
           Q132 68 130 80
           Q136 86 130 96
           Q132 108 120 112
           Q116 122 102 120
           Q94 128 82 122
           Q68 128 58 120
           Q44 120 40 108
           Z"
        fill={colors.white}
        stroke={ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* orelhas */}
      <Path
        d="M46 66 Q34 60 32 48 Q44 48 52 58 Z"
        fill={colors.greenPrimary}
        stroke={ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path
        d="M114 66 Q126 60 128 48 Q116 48 108 58 Z"
        fill={colors.greenPrimary}
        stroke={ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* cabeça */}
      <Circle cx="80" cy="86" r="34" fill={colors.greenPrimary} stroke={ink} strokeWidth={4} />

      <LumiFace mood={mood} ink={ink} />
    </Svg>
  );
}

function LumiFace({ mood, ink }: { mood: LumiMoodVariant; ink: string }) {
  switch (mood) {
    case 'happy':
      return (
        <>
          <Path
            d="M64 82 Q68 74 72 82"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M88 82 Q92 74 96 82"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="62" cy="94" r="5" fill={colors.yellow} opacity={0.7} />
          <Circle cx="98" cy="94" r="5" fill={colors.yellow} opacity={0.7} />
          <Path
            d="M66 98 Q80 112 94 98"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );

    case 'celebrating':
      return (
        <>
          {/* olhos fechados de felicidade (^ ^) */}
          <Path d="M63 84 L73 84" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M87 84 L97 84" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Circle cx="62" cy="94" r="5" fill={colors.yellow} opacity={0.8} />
          <Circle cx="98" cy="94" r="5" fill={colors.yellow} opacity={0.8} />
          {/* boca bem aberta */}
          <Path d="M64 96 Q80 118 96 96 Q80 108 64 96 Z" fill={ink} opacity={0.85} />
        </>
      );

    case 'waiting':
      return (
        <>
          {/* olhos olhando de lado, à espera */}
          <Circle cx="70" cy="84" r="4.5" fill={ink} />
          <Circle cx="94" cy="84" r="4.5" fill={ink} />
          {/* boca reta, neutra */}
          <Path
            d="M70 100 L90 100"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );

    case 'missing_you':
      return (
        <>
          {/* sobrancelhas caídas */}
          <Path d="M62 76 L72 80" stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M98 76 L88 80" stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Circle cx="68" cy="86" r="4.5" fill={ink} />
          <Circle cx="92" cy="86" r="4.5" fill={ink} />
          {/* boca cabisbaixa */}
          <Path
            d="M70 104 Q80 98 90 104"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );

    case 'normal':
    default:
      return (
        <>
          <Circle cx="68" cy="84" r="4.5" fill={ink} />
          <Circle cx="92" cy="84" r="4.5" fill={ink} />
          <Path
            d="M70 100 Q80 106 90 100"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
  }
}
