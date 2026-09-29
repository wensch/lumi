import { StyleSheet, Text } from 'react-native';
import { Card, Screen, ScreenHeader } from '@/components';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function BibliaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <Screen>
      <ScreenHeader title={t('tabs.bible')} />
      <Card style={styles.card}>
        <LumiMascot mood="happy" size={190} />
        <Text style={[theme.typography.subheading, styles.text]}>{t('bible.comingSoon')}</Text>
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
