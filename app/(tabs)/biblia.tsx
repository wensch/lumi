import { StyleSheet, Text } from 'react-native';
import { Card, Screen, ScreenHeader } from '@/components';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';

export default function BibliaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <Screen>
      <ScreenHeader title="Bíblia" />
      <Card style={styles.card}>
        <LumiMascot mood="happy" size={190} />
        <Text style={[theme.typography.subheading, styles.text]}>
          Busca, temas e mais passagens chegam em breve por aqui.
        </Text>
      </Card>
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.blue,
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    text: {
      color: theme.colors.ink,
      textAlign: 'center',
    },
  });
