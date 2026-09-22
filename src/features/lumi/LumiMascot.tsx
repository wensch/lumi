import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '@/theme';

export type LumiMoodVariant = 'normal' | 'happy';

type LumiMascotProps = {
  mood?: LumiMoodVariant;
  size?: number;
};

/**
 * PLACEHOLDER — ilustração vetorial provisória do Lumi (cordeiro 2D flat,
 * contorno grosso, sem auréola/cruz, briefing §8.5), desenhada em código
 * na ausência de gerador de imagem. A arte final está sendo produzida à
 * parte; ao chegar, substituir aqui mantendo a mesma API (mood, size).
 * Estados cobertos: normal, happy.
 */
export function LumiMascot({ mood = 'normal', size = 160 }: LumiMascotProps) {
  const ink = colors.ink;

  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* sombra de contato */}
      <Ellipse cx="80" cy="148" rx="34" ry="6" fill={ink} opacity={0.08} />

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

      {mood === 'happy' ? (
        <>
          {/* olhos felizes (arcos) */}
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
          {/* bochechas */}
          <Circle cx="62" cy="94" r="5" fill={colors.yellow} opacity={0.7} />
          <Circle cx="98" cy="94" r="5" fill={colors.yellow} opacity={0.7} />
          {/* sorriso aberto */}
          <Path
            d="M66 98 Q80 112 94 98"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          {/* olhos normais */}
          <Circle cx="68" cy="84" r="4.5" fill={ink} />
          <Circle cx="92" cy="84" r="4.5" fill={ink} />
          {/* sorriso simples */}
          <Path
            d="M70 100 Q80 106 90 100"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
    </Svg>
  );
}
