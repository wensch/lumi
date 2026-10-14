import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextField } from '@/components';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  CHALLENGE_ICONS,
  CHALLENGE_METRICS,
  CHALLENGE_TITLE_MAX_LENGTH,
  CHALLENGE_WINDOWS,
  type ChallengeMetric,
  type NewChallenge,
} from './types';

type Props = {
  /** Quantas pessoas somam a meta (círculo); sem isto o desafio é só da pessoa. */
  members?: number;
  working: boolean;
  onSubmit: (input: NewChallenge) => void;
  onCancel: () => void;
};

/** Formulário para criar um desafio próprio: nome, o que medir, meta por pessoa e prazo. */
export function CustomChallengeForm({ members, working, onSubmit, onCancel }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string>(CHALLENGE_ICONS[0]);
  const [metric, setMetric] = useState<ChallengeMetric>('moments_days');
  const [windowDays, setWindowDays] = useState<number>(7);
  const [target, setTarget] = useState(5);

  // "Dias com momento" não passa dos dias do prazo.
  const maxTarget = metric === 'moments_days' ? windowDays : 50;
  const safeTarget = Math.min(target, maxTarget);
  const valid = title.trim().length >= 3;
  const isCircle = members !== undefined;
  const summary = t(`challenges.form.summary.${metric}`, { count: safeTarget, days: windowDays });

  return (
    <View style={styles.form}>
      <TextField
        label={t('challenges.form.name')}
        placeholder={t('challenges.form.namePlaceholder')}
        value={title}
        onChangeText={setTitle}
        maxLength={CHALLENGE_TITLE_MAX_LENGTH}
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <Text style={styles.label}>{t('challenges.form.icon')}</Text>
      <View style={styles.chips}>
        {CHALLENGE_ICONS.map((option) => (
          <Chip
            key={option}
            theme={theme}
            label={option}
            selected={icon === option}
            onPress={() => setIcon(option)}
            accessibilityLabel={option}
          />
        ))}
      </View>

      <Text style={styles.label}>{t('challenges.form.metric')}</Text>
      <View style={styles.chips}>
        {CHALLENGE_METRICS.map((option) => (
          <Chip
            key={option}
            theme={theme}
            label={t(`challenges.form.metrics.${option}`)}
            selected={metric === option}
            onPress={() => setMetric(option)}
          />
        ))}
      </View>

      <Text style={styles.label}>{t('challenges.form.window')}</Text>
      <View style={styles.chips}>
        {CHALLENGE_WINDOWS.map((option) => (
          <Chip
            key={option}
            theme={theme}
            label={t('challenges.inDays', { count: option })}
            selected={windowDays === option}
            onPress={() => setWindowDays(option)}
          />
        ))}
      </View>

      <Text style={styles.label}>
        {isCircle ? t('challenges.form.targetCircle') : t('challenges.form.target')}
      </Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => setTarget(Math.max(1, safeTarget - 1))}
          accessibilityRole="button"
          accessibilityLabel={t('challenges.form.less')}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{safeTarget}</Text>
        <Pressable
          onPress={() => setTarget(Math.min(maxTarget, safeTarget + 1))}
          accessibilityRole="button"
          accessibilityLabel={t('challenges.form.more')}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <Text style={[theme.typography.caption, styles.muted]}>
        {summary}
        {isCircle
          ? ` ${t('challenges.form.circleTotal', { total: safeTarget * (members ?? 1), people: members })}`
          : ''}
      </Text>

      <Button
        label={t('challenges.form.create')}
        onPress={() =>
          onSubmit({
            title: title.trim(),
            description: summary,
            icon,
            metric,
            target: safeTarget,
            windowDays,
          })
        }
        disabled={!valid || working}
      />
      <Button label={t('common.cancel')} variant="tertiary" onPress={onCancel} />
    </View>
  );
}

function Chip({
  theme,
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  theme: Theme;
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const styles = getStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    form: {
      gap: theme.spacing.sm,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.ink,
    },
    muted: {
      color: theme.colors.muted,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    chip: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: `${theme.colors.muted}55`,
      backgroundColor: theme.colors.white,
    },
    chipSelected: {
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.yellow,
    },
    chipText: {
      ...theme.typography.bodyStrong,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    stepButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
    },
    stepText: {
      ...theme.typography.heading,
    },
    stepValue: {
      ...theme.typography.heading,
      minWidth: 40,
      textAlign: 'center',
    },
  });
