import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Screen, ScreenHeader, Section } from '@/components';
import { useAuth } from '@/features/auth';
import { useNotificationPreferences } from '@/features/settings';
import { useAppUpdate } from '@/features/updates';
import { hasNotificationPermission, requestNotificationPermission } from '@/features/notifications';
import { useTheme, type Theme } from '@/theme';
import { useTranslation, type LanguageCode } from '@/i18n';

function timeStringToDate(time: string | null): Date {
  if (!time) return new Date(2000, 0, 1, 8, 0);
  const [hourStr, minuteStr] = time.split(':');
  return new Date(2000, 0, 1, Number(hourStr), Number(minuteStr));
}

const LANGUAGES: {
  code: LanguageCode;
  labelKey: 'settings.languagePortuguese' | 'settings.languageEnglish';
}[] = [
  { code: 'pt', labelKey: 'settings.languagePortuguese' },
  { code: 'en', labelKey: 'settings.languageEnglish' },
];

export default function ConfiguracoesScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language, setLanguage } = useTranslation();
  const { session, signOut } = useAuth();
  const { remindersEnabled, preferredTime, loading, updatePreferredTime, setRemindersEnabled } =
    useNotificationPreferences();
  const [showPicker, setShowPicker] = useState(false);
  // Permissão negada no sistema: o lembrete está "ligado" no app mas nada chegaria.
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  useEffect(() => {
    hasNotificationPermission()
      .then((granted) => setPermissionBlocked(!granted))
      .catch(() => {});
  }, [remindersEnabled]);

  const handleToggleReminders = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      setPermissionBlocked(!granted);
      if (!granted) return;
    }
    await setRemindersEnabled(enabled);
  };

  const handleTimeChange = async (selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selectedDate) return;

    const time = `${String(selectedDate.getHours()).padStart(2, '0')}:${String(
      selectedDate.getMinutes(),
    ).padStart(2, '0')}:00`;
    await updatePreferredTime(time);
  };

  return (
    <Screen>
      <ScreenHeader title={t('settings.title')} onBackPress={() => router.back()} />

      <Section label={t('settings.reminders')}>
        <View style={styles.row}>
          <Text style={theme.typography.bodyStrong}>{t('settings.dailyReminder')}</Text>
          <Switch
            value={remindersEnabled}
            onValueChange={handleToggleReminders}
            disabled={loading}
            accessibilityLabel={t('settings.dailyReminder')}
            trackColor={{ true: theme.colors.green, false: theme.colors.bg }}
          />
        </View>

        {remindersEnabled && permissionBlocked ? (
          <>
            <Text style={styles.helperText}>{t('settings.notificationsBlocked')}</Text>
            <Button
              variant="ghost"
              label={t('settings.openSystemSettings')}
              onPress={() => Linking.openSettings().catch(() => {})}
            />
          </>
        ) : null}

        {remindersEnabled ? (
          <>
            <Text style={styles.helperText}>{t('settings.reminderTime')}</Text>
            {Platform.OS === 'android' && !showPicker ? (
              <Button
                variant="ghost"
                label={preferredTime ? preferredTime.slice(0, 5) : t('settings.setTime')}
                onPress={() => setShowPicker(true)}
              />
            ) : null}
            {showPicker || Platform.OS === 'ios' ? (
              <DateTimePicker
                value={timeStringToDate(preferredTime)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) =>
                  handleTimeChange(event.type === 'set' ? selectedDate : undefined)
                }
              />
            ) : null}
          </>
        ) : null}
      </Section>

      <Section label={t('settings.appearance')}>
        <Text style={styles.helperText}>{t('settings.appearanceHint')}</Text>
        <View style={styles.paletteList}>
          {theme.availablePalettes.map((palette) => {
            const isSelected = palette.name === theme.palette.name;
            return (
              <Pressable
                key={palette.name}
                onPress={() => theme.setPaletteName(palette.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[styles.paletteCard, isSelected && styles.paletteCardSelected]}
              >
                <View style={styles.swatches}>
                  {[palette.bg, palette.green, palette.yellow, palette.blue].map((color, index) => (
                    <View key={index} style={[styles.swatch, { backgroundColor: color }]} />
                  ))}
                </View>
                <View style={styles.paletteText}>
                  <Text style={theme.typography.bodyStrong}>
                    {t(`settings.palettes.${palette.name}.name`)}
                  </Text>
                  <Text style={styles.paletteDescription}>
                    {t(`settings.palettes.${palette.name}.description`)}
                  </Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={26} color={theme.colors.ink} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section label={t('settings.language')}>
        <View style={styles.paletteRow}>
          {LANGUAGES.map((option) => {
            const isSelected = option.code === language;
            return (
              <Pressable
                key={option.code}
                onPress={() => setLanguage(option.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.paletteChip,
                  { backgroundColor: isSelected ? theme.colors.green : theme.colors.white },
                ]}
              >
                <Text style={styles.paletteLabel}>{t(option.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {Platform.OS === 'android' ? <UpdatesSection /> : null}

      <Section label={t('settings.account')}>
        <Text style={styles.accountEmail}>
          {t('settings.connectedAs', { email: session?.user.email ?? '' })}
        </Text>
        <Button variant="tertiary" label={t('common.signOut')} onPress={signOut} />
      </Section>
    </Screen>
  );
}

function UpdatesSection() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { status, latest, currentBuild, check, openDownload } = useAppUpdate();

  const statusText =
    status === 'checking'
      ? t('updates.checking')
      : status === 'upToDate'
        ? t('updates.upToDate')
        : status === 'error'
          ? t('updates.error')
          : status === 'available' && latest
            ? t('updates.available', { build: latest.build })
            : null;

  return (
    <Section label={t('updates.title')}>
      <Text style={theme.typography.bodyStrong}>
        {currentBuild > 0
          ? t('updates.currentVersion', { build: currentBuild })
          : t('updates.devVersion')}
      </Text>
      {statusText ? <Text style={styles.helperText}>{statusText}</Text> : null}
      {status === 'available' ? (
        <>
          <Button label={t('updates.update')} onPress={openDownload} />
          <Text style={styles.helperText}>{t('updates.hint')}</Text>
        </>
      ) : (
        <Button
          variant="secondary"
          label={t('updates.check')}
          onPress={check}
          disabled={status === 'checking'}
        />
      )}
    </Section>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    helperText: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      marginTop: theme.spacing.sm,
    },
    paletteRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    paletteList: {
      gap: theme.spacing.sm,
    },
    paletteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bg,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    paletteCardSelected: {
      backgroundColor: theme.colors.green,
      ...theme.shadow.chip,
    },
    swatches: {
      flexDirection: 'row',
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    swatch: {
      width: 16,
      height: 34,
    },
    paletteText: {
      flex: 1,
    },
    paletteDescription: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      opacity: 0.8,
    },
    paletteChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
    },
    paletteLabel: {
      ...theme.typography.button,
      fontSize: 14,
      color: theme.colors.ink,
    },
    accountEmail: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      marginBottom: theme.spacing.sm,
    },
  });
