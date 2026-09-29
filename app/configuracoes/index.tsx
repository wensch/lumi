import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Button, Screen, Section } from '@/components';
import { useAuth } from '@/features/auth';
import { useNotificationPreferences } from '@/features/settings';
import { requestNotificationPermission } from '@/features/notifications';
import { useTheme, type Theme } from '@/theme';

function timeStringToDate(time: string | null): Date {
  if (!time) return new Date(2000, 0, 1, 8, 0);
  const [hourStr, minuteStr] = time.split(':');
  return new Date(2000, 0, 1, Number(hourStr), Number(minuteStr));
}

export default function ConfiguracoesScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { session, signOut } = useAuth();
  const { remindersEnabled, preferredTime, loading, updatePreferredTime, setRemindersEnabled } =
    useNotificationPreferences();
  const [showPicker, setShowPicker] = useState(false);

  const handleToggleReminders = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
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
      <View style={styles.header}>
        <Text style={theme.typography.display}>Configurações</Text>
        <Button variant="tertiary" label="Voltar" onPress={() => router.back()} />
      </View>

      <Section label="Lembretes">
        <View style={styles.row}>
          <Text style={theme.typography.bodyStrong}>Lembrete diário</Text>
          <Switch
            value={remindersEnabled}
            onValueChange={handleToggleReminders}
            disabled={loading}
            trackColor={{ true: theme.colors.green, false: theme.colors.bg }}
          />
        </View>

        {remindersEnabled ? (
          <>
            <Text style={styles.helperText}>Horário do lembrete</Text>
            {Platform.OS === 'android' && !showPicker ? (
              <Button
                variant="ghost"
                label={preferredTime ? preferredTime.slice(0, 5) : 'Definir horário'}
                onPress={() => setShowPicker(true)}
              />
            ) : null}
            {showPicker || Platform.OS === 'ios' ? (
              <DateTimePicker
                value={timeStringToDate(preferredTime)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, selectedDate) => handleTimeChange(selectedDate)}
              />
            ) : null}
          </>
        ) : null}
      </Section>

      <Section label="Aparência">
        <View style={styles.paletteRow}>
          {theme.availablePalettes.map((palette) => {
            const isSelected = palette.name === theme.palette.name;
            return (
              <Pressable
                key={palette.name}
                onPress={() => theme.setPaletteName(palette.name)}
                style={[
                  styles.paletteChip,
                  { backgroundColor: isSelected ? palette.green : theme.colors.white },
                ]}
              >
                <Text style={styles.paletteLabel}>{palette.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section label="Conta">
        <Text style={styles.accountEmail}>Conectado como {session?.user.email}</Text>
        <Button variant="tertiary" label="Sair" onPress={signOut} />
      </Section>
    </Screen>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
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
