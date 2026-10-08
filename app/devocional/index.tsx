import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Bob,
  Button,
  Card,
  Confetti,
  PopIn,
  Screen,
  ScreenContainer,
  TextField,
  useCountUp,
} from '@/components';
import { ACHIEVEMENT_ICONS, isKnownAchievement } from '@/features/achievements';
import { cancelTodaysAlternateReminder } from '@/features/notifications';
import { useAskAboutDevotional, useDevotional } from '@/features/devotional';
import { useVersePassage, verseVersionId } from '@/features/bible';
import { getJourney, JOURNEY_MILESTONES, LumiMascot, outfitForMilestone } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import type { Database } from '@/lib/supabase';

function isMilestone(streak: number) {
  return (JOURNEY_MILESTONES as readonly number[]).includes(streak);
}

/** Fala do Lumi na conclusão: varia pelo contexto e, nos dias comuns, pelo dia do mês (sem sorteio a cada render). */
function lumiCompletionKey(streak: number, unlocked: number, isFirst: boolean) {
  if (isMilestone(streak)) return 'devotional.lumiSays.milestone';
  if (isFirst) return 'devotional.lumiSays.first';
  if (unlocked > 0) return 'devotional.lumiSays.achievement';
  return `devotional.lumiSays.normal${(new Date().getDate() % 3) + 1}`;
}

/** XP por conquista desbloqueada (espelha complete_devotional_session). */
const ACHIEVEMENT_XP = 20;

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
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { content, session, loading, completing, error, complete, retry, isReturningFromBreak } =
    useDevotional();
  const [stepIndex, setStepIndex] = useState(0);
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  // XP "sobe" de 0 até o valor na tela de conclusão.
  const xpShown = useCountUp(result?.xp ?? 0);

  // Ao concluir: vibração de sucesso; marco de sequência ou conquista ganham um segundo toque.
  useEffect(() => {
    if (!result) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (result.unlockedCodes.length > 0 || isMilestone(result.streak)) {
      const timer = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [result]);
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
    isVerseStep ? verseVersionId(content?.youversion_version_id ?? null, language) : null,
    isVerseStep ? (content?.passage_reference ?? null) : null,
  );

  // Fecha a tela; se foi aberta direto (sem histórico), cai na aba Hoje em vez de não fazer nada.
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const handleComplete = async () => {
    const outcome = await complete(reflection.trim() || undefined);
    if (outcome) {
      const unlockedCodes = outcome.unlocked_achievement_codes ?? [];
      setResult({
        streak: outcome.current_streak,
        // Cada conquista desbloqueada rende +20 XP além dos 10 do momento do dia.
        xp: outcome.xp_awarded + ACHIEVEMENT_XP * unlockedCodes.length,
        unlockedCodes,
      });
      // Já concluiu hoje: o lembrete alternativo de hoje não faz mais sentido.
      cancelTodaysAlternateReminder();
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
          {error ?? t('devotional.comeBackLater')}
        </Text>
        {error ? <Button label={t('common.retry')} onPress={retry} /> : null}
        <Button label={t('common.back')} variant="tertiary" onPress={leave} />
      </Screen>
    );
  }

  if (result) {
    // Feedback do agente de teste diário (24/09): quem volta depois de
    // ficar alguns dias sem aparecer merece mais que a mensagem padrão de
    // "momento concluído" — sem soar como se a quebra nunca tivesse
    // acontecido, nem como cobrança por ter sumido (briefing §7.2, §8.3).
    const showReturnWelcome = isReturningFromBreak && result.streak === 1;
    const milestone = isMilestone(result.streak);
    const journey = getJourney(result.streak, result.streak);
    const bigCelebration = milestone || result.unlockedCodes.length > 0;
    const wonOutfit = outfitForMilestone(result.streak);
    const lumiLine = t(
      lumiCompletionKey(
        result.streak,
        result.unlockedCodes.length,
        result.unlockedCodes.includes('first_moment'),
      ),
      { count: result.streak },
    );

    return (
      <ScreenContainer style={styles.doneScreen}>
        <ScrollView contentContainerStyle={styles.doneContent} showsVerticalScrollIndicator={false}>
          <PopIn>
            <View style={styles.doneMascotArea}>
              <View style={styles.doneMascotBackdrop} />
              <Bob>
                <LumiMascot mood="celebrating" size={290} />
              </Bob>
            </View>
          </PopIn>
          <PopIn delay={150}>
            <Text style={[theme.typography.heading, styles.centeredText]}>
              {showReturnWelcome
                ? t('devotional.returnWelcomeTitle')
                : milestone
                  ? t('devotional.milestoneTitle', { count: result.streak })
                  : t('devotional.completedTitle')}
            </Text>
          </PopIn>
          <PopIn delay={300}>
            <Text style={styles.doneChip}>
              {result.xp > 0
                ? t('devotional.xpAndStreak', {
                    xp: xpShown,
                    count: result.streak,
                    unit: t(result.streak === 1 ? 'devotional.day' : 'devotional.days'),
                  })
                : t('devotional.streakOnly', {
                    count: result.streak,
                    unit: t(result.streak === 1 ? 'devotional.day' : 'devotional.days'),
                  })}
            </Text>
          </PopIn>
          <Text style={[theme.typography.caption, styles.doneSubtitle]}>
            {showReturnWelcome ? t('devotional.returnWelcomeSubtitle') : lumiLine}
          </Text>
          {journey.next !== null ? (
            <Text style={[theme.typography.caption, styles.doneSubtitle]}>
              {t('devotional.nextMilestone', {
                title: t(`lumi.milestones.d${journey.next}.title`),
                count: journey.daysToNext,
              })}
            </Text>
          ) : null}

          {result.unlockedCodes.map((code, index) => {
            // Código novo vindo do backend sem ícone/tradução ainda: celebra do mesmo jeito.
            const icon = ACHIEVEMENT_ICONS[code] ?? '🏅';
            return (
              <PopIn key={code} delay={500 + index * 200} style={styles.achievementWrapper}>
                <Card padding="compact" style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{icon}</Text>
                  <Text style={theme.typography.bodyStrong}>
                    {t('devotional.achievementUnlocked', {
                      title: isKnownAchievement(code) ? t(`achievements.${code}`) : code,
                    })}
                  </Text>
                </Card>
              </PopIn>
            );
          })}

          {wonOutfit ? (
            <PopIn delay={700} style={styles.achievementWrapper}>
              <Card padding="compact" style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>{wonOutfit.icon}</Text>
                <Text style={theme.typography.bodyStrong}>
                  {t('devotional.outfitWon', { item: t(`lumi.outfits.${wonOutfit.id}`) })}
                </Text>
              </Card>
            </PopIn>
          ) : null}

          <Button
            label={t('devotional.backToToday')}
            variant="tertiary"
            onPress={() => router.replace('/(tabs)')}
          />
        </ScrollView>
        <Confetti count={bigCelebration ? 56 : 14} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      style={[
        styles.devScreen,
        { backgroundColor: theme.colors[currentStep.bgKey], paddingBottom: 26 + insets.bottom },
      ]}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.devBody}>
        <View style={styles.devHeader}>
          <Pressable
            onPress={leave}
            accessibilityRole="button"
            accessibilityLabel={t('devotional.close')}
            hitSlop={8}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonLabel}>✕</Text>
          </Pressable>
          <View
            style={styles.progressRow}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t('devotional.stepOf', {
              current: stepIndex + 1,
              total: steps.length,
            })}
          >
            {steps.map((step, index) => (
              <View
                key={step.key}
                style={[styles.progressSegment, index <= stepIndex && styles.progressSegmentActive]}
              />
            ))}
          </View>
        </View>

        <View style={styles.stepCard}>
          <ScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepCardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepPill}>{t(currentStep.labelKey)}</Text>

            {currentStep.kind === 'verse' ? (
              <>
                <Text style={styles.verseReference}>
                  {versePassage?.reference ?? (verseLoading ? '' : content.passage_reference)}
                </Text>
                {verseLoading ? (
                  <Text style={styles.stepText}>{t('devotional.preparing')}</Text>
                ) : null}
                {verseError ? (
                  <Text style={styles.stepText}>{t('devotional.verseUnavailable')}</Text>
                ) : null}
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
                    maxLength={500}
                  />
                  {askError ? <Text style={styles.errorText}>{askError}</Text> : null}
                  {answer ? (
                    <>
                      <Text style={styles.answerText}>{answer}</Text>
                      <Text style={styles.aiDisclaimer}>{t('devotional.aiDisclaimer')}</Text>
                    </>
                  ) : null}
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
          </ScrollView>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {error && !session ? (
          <Button label={t('common.retry')} variant="ghost" onPress={retry} />
        ) : null}

        <View style={styles.devFooter}>
          {stepIndex > 0 ? (
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonLabel}>←</Text>
            </Pressable>
          ) : null}
          <Button
            label={isLastStep ? t('devotional.finish') : t('devotional.continueButton')}
            onPress={goNext}
            // Sem sessão só trava o "concluir": ler os passos não depende dela.
            disabled={completing || (isLastStep && !session)}
            style={styles.nextButton}
          />
        </View>
      </KeyboardAvoidingView>
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
    achievementWrapper: {
      width: '100%',
    },
    doneContent: {
      flexGrow: 1,
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
    doneSubtitle: {
      color: theme.colors.ink,
      textAlign: 'center',
    },
    doneMascotBackdrop: {
      position: 'absolute',
      width: 242,
      height: 242,
      borderRadius: 999,
      // O contorno escuro do mascote some sobre fundo escuro: no tema Noite o disco é creme fixo.
      backgroundColor: theme.palette.isDark ? '#FAF6EC' : theme.colors.bg,
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
    },
    devBody: {
      flex: 1,
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
      ...theme.shadow.card,
    },
    stepScroll: {
      flex: 1,
      borderRadius: 25,
    },
    stepCardContent: {
      flexGrow: 1,
      padding: 22,
      gap: theme.spacing.md,
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
    // O erro cai sobre o fundo colorido do passo: vai numa pílula `white` para manter o contraste.
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.danger,
      backgroundColor: theme.colors.white,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      overflow: 'hidden',
    },
    aiDisclaimer: {
      ...theme.typography.caption,
      color: theme.colors.muted,
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
