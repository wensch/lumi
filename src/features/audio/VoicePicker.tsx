import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import { getSavedVoice, isNetworkVoice, listVoices, saveVoice } from './voices';

/** No máximo isto de vozes por grupo (em alguns aparelhos há dezenas; os nomes técnicos não ajudam ninguém). */
const MAX_PER_GROUP = 3;

/** Escolha da voz da leitura em voz alta: nomes simples, dois grupos e um botão de amostra por voz. */
export function VoicePicker() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language } = useTranslation();
  const [voices, setVoices] = useState<Voice[] | null>(null);
  // null = automático (a voz mais natural instalada).
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listVoices(language), getSavedVoice(language)]).then(([list, saved]) => {
      if (cancelled) return;
      setVoices(list);
      setSelected(saved && list.some((voice) => voice.identifier === saved) ? saved : null);
    });
    return () => {
      cancelled = true;
      Speech.stop().catch(() => {});
    };
  }, [language]);

  const sample = useCallback(
    (voice: Voice | undefined, key: string) => {
      Speech.stop().catch(() => {});
      setPlaying(key);
      Speech.speak(t('settings.voiceSample'), {
        language: voice?.language ?? (language === 'pt' ? 'pt-BR' : 'en-US'),
        voice: voice?.identifier,
        rate: 0.92,
        onDone: () => setPlaying((current) => (current === key ? null : current)),
        onStopped: () => setPlaying((current) => (current === key ? null : current)),
        onError: () => setPlaying((current) => (current === key ? null : current)),
      });
    },
    [language, t],
  );

  const choose = useCallback(
    (voice: Voice | null) => {
      setSelected(voice?.identifier ?? null);
      void saveVoice(language, voice?.identifier ?? null);
      // Amostra: a voz escolhida, ou a primeira da lista no automático.
      sample(voice ?? voices?.[0], voice?.identifier ?? 'auto');
    },
    [language, voices, sample],
  );

  if (voices === null) return null;

  if (voices.length === 0) {
    return <Text style={styles.hint}>{t('settings.voiceNone')}</Text>;
  }

  const natural = voices.filter(isNetworkVoice).slice(0, MAX_PER_GROUP);
  const onDevice = voices.filter((voice) => !isNetworkVoice(voice)).slice(0, MAX_PER_GROUP);

  return (
    <View style={styles.list}>
      <Text style={styles.hint}>{t('settings.voiceHint')}</Text>
      <Row
        theme={theme}
        selected={selected === null}
        playing={playing === 'auto'}
        title={t('settings.voiceAuto')}
        onPress={() => choose(null)}
        onPlay={() => sample(voices[0], 'auto')}
        playLabel={t('settings.voicePlay')}
      />
      <Group
        theme={theme}
        title={t('settings.voiceGroupNatural')}
        hint={t('settings.voiceGroupNaturalHint')}
        voices={natural}
        selected={selected}
        playing={playing}
        onChoose={choose}
        onPlay={sample}
      />
      <Group
        theme={theme}
        title={t('settings.voiceGroupDevice')}
        hint={t('settings.voiceGroupDeviceHint')}
        voices={onDevice}
        selected={selected}
        playing={playing}
        onChoose={choose}
        onPlay={sample}
      />
    </View>
  );
}

function Group({
  theme,
  title,
  hint,
  voices,
  selected,
  playing,
  onChoose,
  onPlay,
}: {
  theme: Theme;
  title: string;
  hint: string;
  voices: Voice[];
  selected: string | null;
  playing: string | null;
  onChoose: (voice: Voice) => void;
  onPlay: (voice: Voice, key: string) => void;
}) {
  const styles = getStyles(theme);
  const { t } = useTranslation();
  if (voices.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {voices.map((voice, index) => (
        <Row
          key={voice.identifier}
          theme={theme}
          selected={selected === voice.identifier}
          playing={playing === voice.identifier}
          title={t('settings.voiceName', { number: index + 1 })}
          onPress={() => onChoose(voice)}
          onPlay={() => onPlay(voice, voice.identifier)}
          playLabel={t('settings.voicePlay')}
        />
      ))}
    </View>
  );
}

function Row({
  theme,
  selected,
  playing,
  title,
  onPress,
  onPlay,
  playLabel,
}: {
  theme: Theme;
  selected: boolean;
  playing: boolean;
  title: string;
  onPress: () => void;
  onPlay: () => void;
  playLabel: string;
}) {
  const styles = getStyles(theme);
  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={styles.rowMain}
      >
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={22}
          color={theme.colors.ink}
        />
        <Text style={theme.typography.bodyStrong}>{title}</Text>
      </Pressable>
      <Pressable
        onPress={onPlay}
        accessibilityRole="button"
        accessibilityLabel={`${playLabel}: ${title}`}
        hitSlop={8}
        style={styles.playButton}
      >
        <Ionicons name={playing ? 'volume-high' : 'play'} size={18} color={theme.colors.ink} />
      </Pressable>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: theme.spacing.sm,
    },
    group: {
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    groupTitle: {
      ...theme.typography.bodyStrong,
    },
    hint: {
      ...theme.typography.caption,
      color: theme.colors.muted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingLeft: theme.spacing.sm,
      paddingRight: theme.spacing.xs,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: `${theme.colors.muted}55`,
      backgroundColor: theme.colors.white,
    },
    rowSelected: {
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.yellow,
    },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 48,
    },
    playButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bg,
    },
  });
