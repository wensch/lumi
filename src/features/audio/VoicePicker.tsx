import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import { getSavedVoice, isNetworkVoice, listVoices, saveVoice } from './voices';

/** No máximo isto de vozes na lista (em alguns aparelhos há dezenas). */
const MAX_VOICES = 8;

/** Escolha da voz da leitura em voz alta, com amostra ao tocar. */
export function VoicePicker() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language } = useTranslation();
  const [voices, setVoices] = useState<Voice[] | null>(null);
  // null = automático (a voz mais natural instalada).
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listVoices(language), getSavedVoice(language)]).then(([list, saved]) => {
      if (cancelled) return;
      setVoices(list.slice(0, MAX_VOICES));
      setSelected(saved && list.some((voice) => voice.identifier === saved) ? saved : null);
    });
    return () => {
      cancelled = true;
      Speech.stop().catch(() => {});
    };
  }, [language]);

  const choose = useCallback(
    (voice: Voice | null) => {
      setSelected(voice?.identifier ?? null);
      void saveVoice(language, voice?.identifier ?? null);
      // Amostra: a voz escolhida, ou a primeira da lista no automático.
      const sample = voice ?? voices?.[0];
      Speech.stop().catch(() => {});
      Speech.speak(t('settings.voiceSample'), {
        language: sample?.language ?? (language === 'pt' ? 'pt-BR' : 'en-US'),
        voice: sample?.identifier,
        rate: 0.92,
      });
    },
    [language, voices, t],
  );

  if (voices === null) return null;

  if (voices.length === 0) {
    return <Text style={styles.hint}>{t('settings.voiceNone')}</Text>;
  }

  return (
    <View style={styles.list}>
      <Text style={styles.hint}>{t('settings.voiceHint')}</Text>
      <Row
        theme={theme}
        selected={selected === null}
        title={t('settings.voiceAuto')}
        subtitle={null}
        onPress={() => choose(null)}
      />
      {voices.map((voice) => (
        <Row
          key={voice.identifier}
          theme={theme}
          selected={selected === voice.identifier}
          title={voice.name}
          subtitle={
            isNetworkVoice(voice) ? t('settings.voiceNetwork') : t('settings.voiceOnDevice')
          }
          onPress={() => choose(voice)}
        />
      ))}
    </View>
  );
}

function Row({
  theme,
  selected,
  title,
  subtitle,
  onPress,
}: {
  theme: Theme;
  selected: boolean;
  title: string;
  subtitle: string | null;
  onPress: () => void;
}) {
  const styles = getStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={styles.rowText}>
        <Text style={theme.typography.bodyStrong}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={24} color={theme.colors.ink} /> : null}
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: theme.spacing.sm,
    },
    hint: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: 56,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
    },
    rowSelected: {
      backgroundColor: theme.colors.yellow,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
  });
