import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, ScreenContainer, TextField } from '@/components';
import { ACHIEVEMENT_LABELS } from '@/features/achievements';
import { useDevotional } from '@/features/devotional';
import { LumiMascot } from '@/features/lumi';
import { useTheme, type Theme } from '@/theme';
import type { Database } from '@/lib/supabase';

type Content = Database['public']['Tables']['content']['Row'];
type Result = {
  streak: number;
  xp: number;
  unlockedCodes: string[];
};

type DevotionalStep = {
  key: string;
  label: string;
  bgKey: 'green' | 'white' | 'pink' | 'yellow' | 'blue' | 'bg';
  kind: 'verse' | 'text' | 'reflect';
  text?: string | null;
};

function buildSteps(content: Content): DevotionalStep[] {
  return [
    { key: 'verse', label: 'Versículo', bgKey: 'green', kind: 'verse' },
    { key: 'text', label: 'Texto explicativo', bgKey: 'white', kind: 'text', text: content.body },
    {
      key: 'application',
      label: 'Aplicação',
      bgKey: 'pink',
      kind: 'text',
      text: content.application_text,
    },
    {
      key: 'challenge',
      label: 'Desafio',
      bgKey: 'yellow',
      kind: 'text',
      text: content.challenge_text,
    },
    { key: 'prayer', label: 'Oração', bgKey: 'blue', kind: 'text', text: content.prayer_text },
    { key: 'reflect', label: 'Reflexão', bgKey: 'bg', kind: 'reflect' },
  ].filter((step) => step.kind !== 'text' || !!step.text) as DevotionalStep[];
}

export default function DevocionalScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { content, session, loading, completing, error, complete, isReturningFromBreak } =
    useDevotional();
  const [stepIndex, setStepIndex] = useState(0);
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const steps = useMemo(() => (content ? buildSteps(content) : []), [content]);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

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

  const goNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  if (loading) {
    return (
      <Screen centered>
        <Text style={theme.typography.body}>Preparando seu devocional…</Text>
      </Screen>
    );
  }

  if (!content) {
    return (
      <Screen centered contentContainerStyle={styles.centeredContent}>
        <Text style={[theme.typography.heading, styles.centeredText]}>
          Ainda não há devocional disponível.
        </Text>
        <Text style={[theme.typography.body, styles.subtitle]}>Volte em breve.</Text>
        <Button label="Voltar" variant="tertiary" onPress={() => router.back()} />
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
            {showReturnWelcome ? 'Que bom te ver de novo!' : 'Devocional concluído!'}
          </Text>
          <Text style={styles.doneChip}>
            {result.xp > 0
              ? `+${result.xp} XP · sequência de ${result.streak} ${result.streak === 1 ? 'dia' : 'dias'}`
              : `Sequência de ${result.streak} ${result.streak === 1 ? 'dia' : 'dias'}`}
          </Text>
          {showReturnWelcome ? (
            <Text style={[theme.typography.caption, styles.subtitle]}>
              Recomeçar já é a parte que mais importa.
            </Text>
          ) : null}

          {result.unlockedCodes.map((code) => {
            const achievement = ACHIEVEMENT_LABELS[code];
            if (!achievement) return null;
            return (
              <Card key={code} padding="compact" style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={theme.typography.bodyStrong}>
                  Conquista desbloqueada: {achievement.title}
                </Text>
              </Card>
            );
          })}

          <Button
            label="Transformar isso em oração"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/oracao', params: { devotional_session_id: session?.id } })
            }
          />
          <Button
            label="Voltar para Hoje"
            variant="tertiary"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={[styles.devScreen, { backgroundColor: theme.colors[currentStep.bgKey] }]}>
      <View style={styles.devHeader}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
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
        <Text style={styles.stepPill}>{currentStep.label}</Text>

        {currentStep.kind === 'verse' ? (
          <>
            <Text style={styles.verseReference}>{content.passage_reference}</Text>
            <Text style={theme.typography.heading}>{content.title}</Text>
          </>
        ) : null}

        {currentStep.kind === 'text' ? (
          <Text style={styles.stepText}>{currentStep.text}</Text>
        ) : null}

        {currentStep.kind === 'reflect' ? (
          <>
            <Text style={theme.typography.heading}>Quer registrar uma reflexão? (opcional)</Text>
            <TextField
              label="Sua reflexão"
              placeholder="O que ficou com você hoje..."
              value={reflection}
              onChangeText={setReflection}
              multiline
              style={styles.reflectionInput}
            />
          </>
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
          label={isLastStep ? 'Concluir meu devocional' : 'Continuar'}
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
      paddingTop: 16,
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
