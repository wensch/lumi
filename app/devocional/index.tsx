import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, ScreenContainer, TextField } from '@/components';
import { ACHIEVEMENT_ICONS } from '@/features/achievements';
import { useAskAboutDevotional, useDevotional } from '@/features/devotional';
import { useVersePassage } from '@/features/bible';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import type { Database } from '@/lib/supabase';

type Content = Database['public']['Tables']['content']['Row'];
type Result = {
  streak: number;
  xp: number;
  unlockedCodes: string[];
};

type DevotionalStep = {
  key: string;
  labelKey:
    | 'devotional.stepVerse'
    | 'devotional.stepText'
    | 'devotional.stepApplication'
    | 'devotional.stepChallenge'
    | 'devotional.stepPrayer'
    | 'devotional.stepReflect';
  bgKey: 'green' | 'white' | 'pink' | 'yellow' | 'blue' | 'bg';
  kind: 'verse' | 'text' | 'reflect';
  text?: string | null;
};

function buildSteps(content: Content): DevotionalStep[] {
  return [
    { key: 'verse', labelKey: 'devotional.stepVerse', bgKey: 'green', kind: 'verse' },
    {
      key: 'text',
      labelKey: 'devotional.stepText',
      bgKey: 'white',
      kind: 'text',
      text: content.body,
    },
    {
      key: 'application',
      labelKey: 'devotional.stepApplication',
      bgKey: 'pink',
      kind: 'text',
      text: content.application_text,
    },
    {
      key: 'challenge',
      labelKey: 'devotional.stepChallenge',
      bgKey: 'yellow',
      kind: 'text',
      text: content.challenge_text,
    },
    {
      key: 'prayer',
      labelKey: 'devotional.stepPrayer',
      bgKey: 'blue',
      kind: 'text',
      text: content.prayer_text,
    },
    { key: 'reflect', labelKey: 'devotional.stepReflect', bgKey: 'bg', kind: 'reflect' },
  ].filter((step) => step.kind !== 'text' || !!step.text) as DevotionalStep[];
}

export default function DevocionalScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { content, session, loading, completing, error, complete, isReturningFromBreak } =
    useDevotional();
  const [stepIndex, setStepIndex] = useState(0);
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [showAsk, setShowAsk] = useState(false);
  const [question, setQuestion] = useState('');
  const {
    ask,
    reset: resetAsk,
    asking,
    answer,
    error: askError,
  } = useAskAboutDevotional(session?.id ?? null);

  const steps = useMemo(() => (content ? buildSteps(content) : []), [content]);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const canAsk = currentStep?.kind === 'verse' || currentStep?.kind === 'text';

  const isVerseStep = currentStep?.kind === 'verse';
  const {
    passage: versePassage,
    loading: verseLoading,
    error: verseError,
  } = useVersePassage(
    isVerseStep ? (content?.youversion_version_id ?? null) : null,
    isVerseStep ? (content?.passage_reference ?? null) : null,
  );

  const handleComplete = async () => {
    const outcome = await complete(reflection.trim() || undefined);
    if (outcome) {
      setResult({
        streak: outcome.current_streak,
        xp: outcome.xp_awarded,
        unlockedCodes: outcome.unlocked_achievement_codes ?? [],
      });
    }
  };

  const closeAsk = () => {
    setShowAsk(false);
    setQuestion('');
    resetAsk();
  };

  const goNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    closeAsk();
    setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    closeAsk();
    setStepIndex((i) => Math.max(0, i - 1));
  };

  if (loading) {
    return (
      <Screen centered>
        <Text style={theme.typography.body}>{t('devotional.preparing')}</Text>
      </Screen>
    );
  }

  if (!content) {
    return (
      <Screen centered contentContainerStyle={styles.centeredContent}>
        <Text style={[theme.typography.heading, styles.centeredText]}>
          {t('devotional.unavailable')}
        </Text>
        <Text style={[theme.typography.body, styles.subtitle]}>
          {t('devotional.comeBackLater')}
        </Text>
        <Button label={t('common.back')} variant="tertiary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (result) {
    // Feedback do agente de teste diário (24/09): quem volta depois de
    // ficar alguns dias sem aparecer merece mais que a mensagem padrão de
    // "momento concluído" — sem soar como se a quebra nunca tivesse
    // acontecido, nem como cobrança por ter sumido (briefing §7.2, §8.3).
    const showReturnWelcome = isReturningFromBreak && result.streak === 1;

    return (
      <ScreenContainer style={styles.doneScreen}>
        <View style={styles.doneContent}>
          <View style={styles.doneMascotArea}>
            <View style={styles.doneMascotBackdrop} />
            <LumiMascot mood="celebrating" size={290} />
          </View>
          <Text style={[theme.typography.heading, styles.centeredText]}>
            {showReturnWelcome
              ? t('devotional.returnWelcomeTitle')
              : t('devotional.completedTitle')}
          </Text>
          <Text style={styles.doneChip}>
            {result.xp > 0
              ? t('devotional.xpAndStreak', {
                  xp: result.xp,
                  count: result.streak,
                  unit: t(result.streak === 1 ? 'devotional.day' : 'devotional.days'),
                })
              : t('devotional.streakOnly', {
                  count: result.streak,
                  unit: t(result.streak === 1 ? 'devotional.day' : 'devotional.days'),
                })}
          </Text>
          {showReturnWelcome ? (
            <Text style={[theme.typography.caption, styles.subtitle]}>
              {t('devotional.returnWelcomeSubtitle')}
            </Text>
          ) : null}

          {result.unlockedCodes.map((code) => {
            const icon = ACHIEVEMENT_ICONS[code];
            if (!icon) return null;
            return (
              <Card key={code} padding="compact" style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>{icon}</Text>
                <Text style={theme.typography.bodyStrong}>
                  {t('devotional.achievementUnlocked', { title: t(`achievements.${code}`) })}
                </Text>
              </Card>
            );
          })}

          <Button
            label={t('devotional.turnIntoPrayer')}
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/oracao', params: { devotional_session_id: session?.id } })
            }
          />
          <Button
            label={t('devotional.backToToday')}
            variant="tertiary"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      style={[styles.devScreen, { backgroundColor: theme.colors[currentStep.bgKey] }]}
    >
      <View style={styles.devHeader}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('devotional.close')}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonLabel}>✕</Text>
        </Pressable>
        <View style={styles.progressRow}>
          {steps.map((step, index) => (
            <View
              key={step.key}
              style={[styles.progressSegment, index <= stepIndex && styles.progressSegmentActive]}
            />
          ))}
        </View>
      </View>

      <View style={styles.stepCard}>
        <Text style={styles.stepPill}>{t(currentStep.labelKey)}</Text>

        {currentStep.kind === 'verse' ? (
          <>
            <Text style={styles.verseReference}>
              {versePassage?.reference ?? content.passage_reference}
            </Text>
            {verseLoading ? <Text style={styles.stepText}>{t('devotional.preparing')}</Text> : null}
            {verseError ? <Text style={styles.stepText}>{content.title}</Text> : null}
            {versePassage ? <Text style={styles.stepText}>{versePassage.content}</Text> : null}
          </>
        ) : null}

        {currentStep.kind === 'text' ? (
          <Text style={styles.stepText}>{currentStep.text}</Text>
        ) : null}

        {currentStep.kind === 'reflect' ? (
          <>
            <Text style={theme.typography.heading}>{t('devotional.reflectQuestion')}</Text>
            <TextField
              label={t('devotional.reflectLabel')}
              placeholder={t('devotional.reflectPlaceholder')}
              value={reflection}
              onChangeText={setReflection}
              multiline
              style={styles.reflectionInput}
            />
          </>
        ) : null}

        {canAsk ? (
          showAsk ? (
            <View style={styles.askBox}>
              <TextField
                label={t('devotional.askLabel')}
                placeholder={t('devotional.askPlaceholder')}
                value={question}
                onChangeText={setQuestion}
                multiline
              />
              {askError ? <Text style={styles.errorText}>{askError}</Text> : null}
              {answer ? <Text style={styles.answerText}>{answer}</Text> : null}
              <View style={styles.askActions}>
                <Button
                  label={asking ? t('devotional.asking') : t('devotional.ask')}
                  variant="secondary"
                  onPress={() => ask(question)}
                  disabled={asking || !question.trim()}
                />
                <Button label={t('devotional.close')} variant="tertiary" onPress={closeAsk} />
              </View>
            </View>
          ) : (
            <Button
              label={t('devotional.askAboutText')}
              variant="ghost"
              onPress={() => setShowAsk(true)}
            />
          )
        ) : null}

        <View style={styles.stepMascot}>
          <LumiMascot mood="waiting" size={110} />
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.devFooter}>
        {stepIndex > 0 ? (
          <Pressable onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>←</Text>
          </Pressable>
        ) : null}
        <Button
          label={isLastStep ? t('devotional.finish') : t('devotional.continueButton')}
          onPress={goNext}
          disabled={completing || !session}
          style={styles.nextButton}
        />
      </View>
    </ScreenContainer>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    centeredContent: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: 22,
    },
    centeredText: {
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.muted,
      textAlign: 'center',
    },
    // Tela de conclusão
    doneScreen: {
      backgroundColor: theme.colors.yellow,
    },
    doneContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: 22,
      paddingVertical: theme.spacing.lg,
    },
    doneMascotArea: {
      width: 270,
      height: 270,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneMascotBackdrop: {
      position: 'absolute',
      width: 242,
      height: 242,
      borderRadius: 999,
      backgroundColor: theme.colors.bg,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
    },
    doneChip: {
      ...theme.typography.button,
      color: theme.colors.ink,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 18,
    },
    achievementCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      width: '100%',
    },
    achievementIcon: {
      fontSize: 28,
    },
    // Fluxo em passos
    devScreen: {
      paddingHorizontal: 22,
      paddingTop: theme.spacing.xl,
      paddingBottom: 26,
      gap: theme.spacing.md,
    },
    devHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonLabel: {
      ...theme.typography.button,
      color: theme.colors.ink,
    },
    progressRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 5,
    },
    progressSegment: {
      flex: 1,
      height: 12,
      borderRadius: 99,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.white,
    },
    progressSegmentActive: {
      backgroundColor: theme.colors.ink,
    },
    stepCard: {
      flex: 1,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: 28,
      padding: 22,
      gap: theme.spacing.md,
      ...theme.shadow.card,
    },
    stepPill: {
      ...theme.typography.label,
      alignSelf: 'flex-start',
      color: theme.colors.ink,
      backgroundColor: theme.colors.bg,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 14,
    },
    verseReference: {
      ...theme.typography.display,
      color: theme.colors.ink,
    },
    stepText: {
      ...theme.typography.body,
      fontSize: 20,
      lineHeight: 28,
      color: theme.colors.ink,
    },
    reflectionInput: {
      minHeight: 140,
    },
    askBox: {
      gap: theme.spacing.sm,
    },
    askActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    answerText: {
      ...theme.typography.body,
      color: theme.colors.ink,
      backgroundColor: theme.colors.bg,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    stepMascot: {
      alignSelf: 'flex-end',
      marginTop: 'auto',
    },
    errorText: {
      ...theme.typography.caption,
      color: '#E05252',
    },
    devFooter: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    backButton: {
      width: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: 18,
      ...theme.shadow.button,
    },
    backButtonLabel: {
      ...theme.typography.button,
      color: theme.colors.ink,
    },
    nextButton: {
      flex: 1,
    },
  });
