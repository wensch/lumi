import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, ScreenHeader } from '@/components';
import { LumiMascot, type LumiMoodVariant } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';

const STATES: { mood: LumiMoodVariant; label: string }[] = [
  { mood: 'normal', label: 'Normal' },
  { mood: 'happy', label: 'Feliz' },
  { mood: 'celebrating', label: 'Comemorando' },
  { mood: 'waiting', label: 'Esperando' },
  { mood: 'missing_you', label: 'Com saudade' },
];

export default function LumiScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [selected, setSelected] = useState(0);
  const current = STATES[selected];

  return (
    <Screen>
      <ScreenHeader title="Lumi" />

      <Card style={styles.moodCard}>
        <LumiMascot mood={current.mood} size={250} />
        <Text style={styles.moodLabel}>{current.label}</Text>
      </Card>

      <View style={styles.chipsRow}>
        {STATES.map((state, index) => {
          const isSelected = index === selected;
          return (
            <Pressable
              key={state.mood}
              onPress={() => setSelected(index)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={styles.chipLabel}>{state.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.helperText}>
        Mais estados, evolução e personalização do Lumi aparecem aqui em breve.
      </Text>
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    moodCard: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.lg,
    },
    moodLabel: {
      ...theme.typography.heading,
      color: theme.colors.ink,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 18,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    chip: {
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 9,
      paddingHorizontal: 16,
      ...theme.shadow.chip,
    },
    chipSelected: {
      backgroundColor: theme.colors.green,
      ...theme.shadow.buttonPressed,
    },
    chipLabel: {
      ...theme.typography.button,
      fontSize: 15,
      color: theme.colors.ink,
    },
    helperText: {
      ...theme.typography.body,
      color: theme.colors.muted,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
  });
