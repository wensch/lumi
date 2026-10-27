import type { ComponentType } from 'react';
import type { IconProps } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Armchair } from 'phosphor-react-native/src/icons/Armchair';
import { Bird } from 'phosphor-react-native/src/icons/Bird';
import { BookOpen } from 'phosphor-react-native/src/icons/BookOpen';
import { Books } from 'phosphor-react-native/src/icons/Books';
import { CalendarDots } from 'phosphor-react-native/src/icons/CalendarDots';
import { Compass } from 'phosphor-react-native/src/icons/Compass';
import { Crown } from 'phosphor-react-native/src/icons/Crown';
import { Flame } from 'phosphor-react-native/src/icons/Flame';
import { Handshake } from 'phosphor-react-native/src/icons/Handshake';
import { HandsPraying } from 'phosphor-react-native/src/icons/HandsPraying';
import { Heart } from 'phosphor-react-native/src/icons/Heart';
import { Lamp } from 'phosphor-react-native/src/icons/Lamp';
import { Leaf } from 'phosphor-react-native/src/icons/Leaf';
import { Medal } from 'phosphor-react-native/src/icons/Medal';
import { PencilSimpleLine } from 'phosphor-react-native/src/icons/PencilSimpleLine';
import { Plant } from 'phosphor-react-native/src/icons/Plant';
import { Rainbow } from 'phosphor-react-native/src/icons/Rainbow';
import { Sparkle } from 'phosphor-react-native/src/icons/Sparkle';
import { Star } from 'phosphor-react-native/src/icons/Star';
import { SunHorizon } from 'phosphor-react-native/src/icons/SunHorizon';
import { Target } from 'phosphor-react-native/src/icons/Target';
import { Trophy } from 'phosphor-react-native/src/icons/Trophy';
import { TreeEvergreen } from 'phosphor-react-native/src/icons/TreeEvergreen';
import { useTheme } from '@/theme';

/**
 * Ícones do Lumi (Phosphor, traço arredondado). O banco guarda o ícone de planos, desafios e
 * conquistas como emoji; aqui cada emoji conhecido vira o ícone de traço correspondente, com a cor
 * do tema. Emoji fora da lista (ex.: de um plano ou desafio criado antes) segue aparecendo como emoji.
 * Importa ícone por ícone: o pacote tem mais de mil e não deve entrar inteiro no app.
 */
const BY_EMOJI: Record<string, ComponentType<IconProps>> = {
  '🔥': Flame,
  '🌿': Leaf,
  '🌱': Plant,
  '✍️': PencilSimpleLine,
  '💛': Heart,
  '🙏': HandsPraying,
  '🗓️': CalendarDots,
  '🤝': Handshake,
  '🎯': Target,
  '📖': BookOpen,
  '📚': Books,
  '🧭': Compass,
  '🛋️': Armchair,
  '✨': Sparkle,
  '⭐': Star,
  '🌟': Star,
  '🏆': Trophy,
  '🏅': Medal,
  '👑': Crown,
  '🌈': Rainbow,
  '🕊️': Bird,
  '🕯️': Lamp,
  '🎄': TreeEvergreen,
  '🌅': SunHorizon,
};

/** Emoji que o app sabe desenhar como ícone (usado nos seletores). */
export function hasLumiIcon(emoji: string): boolean {
  return emoji in BY_EMOJI;
}

type LumiIconProps = {
  /** Emoji vindo do banco ou do código (ex.: '🔥'). */
  name: string | null | undefined;
  size?: number;
  /** Cor do traço; por padrão a cor de texto do tema. */
  color?: string;
  weight?: IconProps['weight'];
  /** Emoji mostrado se o nome não tiver ícone nem for informado. */
  fallback?: string;
};

/** Ícone decorativo: o leitor de tela ignora, o texto ao lado já diz o que é. */
export function LumiIcon({ name, size = 24, color, weight = 'duotone', fallback }: LumiIconProps) {
  const theme = useTheme();
  const key = name ?? fallback ?? '';
  const Icon = BY_EMOJI[key];
  const tone = color ?? theme.colors.ink;
  if (!Icon) {
    return (
      <Text
        style={{ fontSize: size * 0.9, lineHeight: size * 1.15, textAlign: 'center' }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {key}
      </Text>
    );
  }
  return (
    <Icon size={size} color={tone} weight={weight} duotoneColor={tone} duotoneOpacity={0.28} />
  );
}

type IconBadgeProps = LumiIconProps & {
  /** Cor de fundo do círculo; por padrão o branco do tema. */
  background?: string;
  /** Tamanho do círculo (o ícone ocupa cerca de metade). */
  diameter?: number;
};

/** Ícone dentro de um círculo com contorno firme, no estilo dos cartões do app. */
export function IconBadge({ background, diameter = 48, size, ...icon }: IconBadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: background ?? theme.colors.white,
          borderColor: theme.colors.ink,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LumiIcon {...icon} size={size ?? Math.round(diameter * 0.56)} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
});
