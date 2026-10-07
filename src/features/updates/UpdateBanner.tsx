import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, FadeIn } from '@/components';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAppUpdate } from './useAppUpdate';

/**
 * Aviso discreto no topo da Hoje quando há build novo na release. Some ao
 * dispensar (só nesta abertura do app) e não aparece em build de desenvolvimento.
 */
export function UpdateBanner() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { status, latest, openDownload } = useAppUpdate({ autoCheck: true });
  const [dismissed, setDismissed] = useState(false);

  if (status !== 'available' || !latest || dismissed) return null;

  return (
    <FadeIn>
      <Card padding="compact" style={styles.card}>
        <View style={styles.text}>
          <Text style={theme.typography.bodyStrong}>{t('updates.bannerTitle')}</Text>
          <Text style={[theme.typography.caption, styles.muted]}>
            {t('updates.bannerSubtitle', { build: latest.build })}
          </Text>
        </View>
        <Pressable
          onPress={openDownload}
          accessibilityRole="button"
          style={({ pressed }) => [styles.updateButton, pressed && styles.pressed]}
        >
          <Text style={styles.updateLabel}>{t('updates.update')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setDismissed(true)}
          accessibilityRole="button"
          accessibilityLabel={t('updates.dismiss')}
          hitSlop={10}
        >
          <Text style={styles.dismiss}>✕</Text>
        </Pressable>
      </Card>
    </FadeIn>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.blue,
    },
    text: {
      flex: 1,
    },
    muted: {
      color: theme.colors.ink,
      opacity: 0.75,
    },
    updateButton: {
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    pressed: {
      opacity: 0.7,
    },
    updateLabel: {
      ...theme.typography.button,
      fontSize: 14,
      color: theme.colors.ink,
    },
    dismiss: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
  });
