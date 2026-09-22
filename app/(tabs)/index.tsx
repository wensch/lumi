import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, ScreenContainer, StreakBadge, XPBadge } from '@/components';
import { useHomeData } from '@/features/home';
import { LumiMascot, lumiMoodToVariant } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

export default function HojeScreen() {
  const { currentStreak, totalXp, lumiMood } = useHomeData();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <StreakBadge days={currentStreak} />
        <XPBadge xp={totalXp} />
      </View>

      <Card style={styles.heroCard}>
        <LumiMascot mood={lumiMoodToVariant(lumiMood)} size={140} />
        <Text style={typography.heading}>Oi! Eu sou o Lumi.</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Seu momento de hoje ainda não começou. Bora?
        </Text>
      </Card>

      <Button label="Começar meu momento" onPress={() => router.push('/devocional')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.ink,
    textAlign: 'center',
  },
});
