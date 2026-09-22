import { StyleSheet, Text, View } from 'react-native';
import { Card, ScreenContainer } from '@/components';
import { LumiMascot, type LumiMoodVariant } from '@/features/lumi';
import { spacing, typography } from '@/theme';

const STATES: { mood: LumiMoodVariant; label: string }[] = [
  { mood: 'normal', label: 'Normal' },
  { mood: 'happy', label: 'Feliz' },
  { mood: 'celebrating', label: 'Comemorando' },
  { mood: 'waiting', label: 'Esperando' },
  { mood: 'missing_you', label: 'Com saudade' },
];

export default function LumiScreen() {
  return (
    <ScreenContainer>
      <Text style={typography.title}>Lumi</Text>
      <Card style={styles.card}>
        <View style={styles.statesGrid}>
          {STATES.map((state) => (
            <View key={state.mood} style={styles.stateItem}>
              <LumiMascot mood={state.mood} size={90} />
              <Text style={typography.caption}>{state.label}</Text>
            </View>
          ))}
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
  statesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateItem: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 100,
  },
});
