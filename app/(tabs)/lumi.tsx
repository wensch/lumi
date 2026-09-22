import { StyleSheet, Text, View } from 'react-native';
import { Card, ScreenContainer } from '@/components';
import { LumiMascot } from '@/features/lumi';
import { spacing, typography } from '@/theme';

export default function LumiScreen() {
  return (
    <ScreenContainer>
      <Text style={typography.title}>Lumi</Text>
      <Card style={styles.card}>
        <View style={styles.statesRow}>
          <View style={styles.stateItem}>
            <LumiMascot mood="normal" size={100} />
            <Text style={typography.caption}>Normal</Text>
          </View>
          <View style={styles.stateItem}>
            <LumiMascot mood="happy" size={100} />
            <Text style={typography.caption}>Feliz</Text>
          </View>
        </View>
        <Text style={typography.body}>
          Mais estados, evolução e personalização do Lumi aparecem aqui em breve.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
  },
  statesRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stateItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
});
