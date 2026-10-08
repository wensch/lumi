import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, FadeIn, Screen, ScreenHeader, Skeleton } from '@/components';
import { useJournal, type JournalEntry } from '@/features/profile';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

export default function HistoricoScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language } = useTranslation();
  const { entries, loading, error, refetch, clearReflection } = useJournal();

  const confirmClear = (entry: JournalEntry) => {
    Alert.alert(t('journal.deleteConfirmTitle'), t('journal.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('journal.deleteReflection'),
        style: 'destructive',
        onPress: async () => {
          const ok = await clearReflection(entry.id);
          if (!ok) Alert.alert(t('journal.deleteFailed'));
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title={t('journal.title')} onBackPress={() => router.back()} />
      <Text style={[theme.typography.caption, styles.muted]}>{t('journal.private')}</Text>

      {loading ? (
        <>
          <Skeleton height={120} radius={theme.radius.lg} />
          <Skeleton height={120} radius={theme.radius.lg} />
          <Skeleton height={120} radius={theme.radius.lg} />
        </>
      ) : error ? (
        <Card style={styles.centeredCard}>
          <Text style={[theme.typography.body, styles.centeredText]}>{t('journal.loadError')}</Text>
          <Button label={t('common.retry')} variant="ghost" onPress={refetch} />
        </Card>
      ) : entries.length === 0 ? (
        <Text style={theme.typography.body}>{t('journal.empty')}</Text>
      ) : (
        entries.map((entry, index) => (
          <FadeIn key={entry.id} delay={Math.min(index, 6) * 50} rise={8}>
            <Card style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={[theme.typography.bodyStrong, styles.entryTitle]}>
                  {entry.title ?? t('profile.defaultDevotionalName')}
                </Text>
                <Text style={styles.date}>
                  {new Date(entry.completedAt).toLocaleDateString(
                    language === 'en' ? 'en-US' : 'pt-BR',
                  )}
                </Text>
              </View>
              {entry.reflection ? (
                <>
                  <Text style={theme.typography.body} selectable>
                    {entry.reflection}
                  </Text>
                  <Button
                    label={t('journal.deleteReflection')}
                    variant="tertiary"
                    onPress={() => confirmClear(entry)}
                  />
                </>
              ) : (
                <Text style={[theme.typography.caption, styles.muted]}>
                  {t('journal.noReflection')}
                </Text>
              )}
            </Card>
          </FadeIn>
        ))
      )}
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    muted: {
      color: theme.colors.muted,
    },
    centeredCard: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    centeredText: {
      textAlign: 'center',
    },
    entry: {
      gap: theme.spacing.sm,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
    },
    entryTitle: {
      flex: 1,
    },
    date: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
  });
