import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { StreakShareCard } from './StreakShareCard';

type OffscreenShareCardProps = {
  streak: number;
  totalXp: number;
};

/**
 * captureRef precisa que a view esteja montada e tenha passado por layout
 * — collapsable={false} sozinho não basta se a view nunca ocupa espaço.
 * Renderiza o card fora da tela (offset negativo grande) em vez de
 * display:none/opacity:0, para garantir medidas reais no layout nativo.
 */
export const OffscreenShareCard = forwardRef<View, OffscreenShareCardProps>(
  function OffscreenShareCard({ streak, totalXp }, ref) {
    return (
      <View
        style={styles.offscreen}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <StreakShareCard ref={ref} streak={streak} totalXp={totalXp} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: 0,
    left: -10000,
  },
});
