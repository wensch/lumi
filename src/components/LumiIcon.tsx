import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '@/theme';
import { EMOJI_ART } from './emojiArt';

/**
 * Ícones coloridos do Lumi. O banco guarda o ícone de planos, desafios e conquistas como emoji; aqui
 * cada emoji conhecido vira o desenho do Fluent Emoji Flat (igual em qualquer aparelho, traço macio
 * e cores chapadas, que combinam com o visual "Recorte"). Emoji sem desenho (ex.: um criado fora da
 * lista) aparece como emoji do sistema, então nada some.
 */
const key = (emoji: string) => emoji.replace('️', '');

/** Emoji que o app sabe desenhar (usado nos seletores). */
export function hasLumiIcon(emoji: string): boolean {
  return key(emoji) in EMOJI_ART;
}

type LumiIconProps = {
  /** Emoji vindo do banco ou do código (ex.: '🔥'). */
  name: string | null | undefined;
  size?: number;
  /** Emoji usado quando `name` é vazio. */
  fallback?: string;
};

/** Ícone decorativo: o leitor de tela ignora, o texto ao lado já diz o que é. */
export const LumiIcon = memo(function LumiIcon({ name, size = 24, fallback }: LumiIconProps) {
  const emoji = name || fallback || '';
  const art = EMOJI_ART[key(emoji)];
  if (!art) {
    return (
      <Text
        style={{ fontSize: size * 0.85, lineHeight: size * 1.15, textAlign: 'center' }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {emoji}
      </Text>
    );
  }
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SvgXml xml={art} width={size} height={size} />
    </View>
  );
});

type IconBadgeProps = LumiIconProps & {
  /** Cor de fundo do círculo; por padrão o branco do tema. */
  background?: string;
  /** Tamanho do círculo (o ícone ocupa cerca de 60%). */
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
      <LumiIcon {...icon} size={size ?? Math.round(diameter * 0.6)} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
});
