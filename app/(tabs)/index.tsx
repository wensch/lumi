import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, ScreenContainer, StreakBadge, XPBadge } from '@/components';
import { LumiMascot } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

export default function HojeScreen() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <StreakBadge days={0} />
        <XPBadge xp={0} />
      </View>

      <Card style={styles.heroCard}>
        <LumiMascot mood="normal" size={140} />
        <Text style={typography.heading}>Oi! Eu sou o Lumi.</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Seu momento de hoje ainda não começou. Bora?
        </Text>
      </Card>

      <Button label="Começar meu momento" onPress={() => {}} />
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
