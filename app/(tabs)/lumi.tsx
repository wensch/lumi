import { StyleSheet, Text } from 'react-native';
import { Card, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';

export default function LumiScreen() {
  return (
    <ScreenContainer>
      <Text style={typography.title}>Lumi</Text>
      <Card style={styles.card}>
        <Text style={styles.mascotPlaceholder}>🐑</Text>
        <Text style={typography.body}>
          Estados, evolução e personalização do Lumi aparecem aqui em breve.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  mascotPlaceholder: {
    fontSize: 64,
  },
});
