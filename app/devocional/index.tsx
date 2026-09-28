import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, ScreenContainer, TextField } from '@/components';
import { ACHIEVEMENT_LABELS } from '@/features/achievements';
import { useDevotional } from '@/features/devotional';
import { BibleReferenceCard } from '@/features/devotional/BibleReferenceCard';
import { LumiMascot } from '@/features/lumi';
import { colors, spacing, typography } from '@/theme';

type Result = {
  streak: number;
  xp: number;
  unlockedCodes: string[];
};

export default function DevocionalScreen() {
  const { content, session, loading, completing, error, complete, isReturningFromBreak } =
    useDevotional();
  const [reflection, setReflection] = useState('');
  const [result, setResult] = useState<Result | null>(null);

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

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <Text style={typography.body}>Preparando seu devocional…</Text>
      </ScreenContainer>
    );
  }

  if (!content) {
    return (
      <ScreenContainer style={styles.centered}>
        <Text style={typography.heading}>Ainda não há devocional disponível.</Text>
        <Text style={[typography.body, styles.subtitle]}>Volte em breve.</Text>
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  if (result) {
    // Feedback do agente de teste diário (24/09): quem volta depois de
    // ficar alguns dias sem aparecer merece mais que a mensagem padrão de
    // "momento concluído" — sem soar como se a quebra nunca tivesse
    // acontecido, nem como cobrança por ter sumido (briefing §7.2, §8.3).
    const showReturnWelcome = isReturningFromBreak && result.streak === 1;

    return (
      <ScreenContainer style={styles.centered}>
        <LumiMascot mood="celebrating" size={140} />
        <Text style={typography.heading}>
          {showReturnWelcome ? 'Que bom te ver de novo!' : 'Momento concluído!'}
        </Text>
        <Text style={[typography.body, styles.subtitle]}>
          {result.xp > 0
            ? `+${result.xp} XP · sequência de ${result.streak} ${result.streak === 1 ? 'dia' : 'dias'}`
            : `Sequência de ${result.streak} ${result.streak === 1 ? 'dia' : 'dias'}`}
        </Text>
        {showReturnWelcome ? (
          <Text style={[typography.caption, styles.subtitle]}>
            Recomeçar já é a parte que mais importa.
          </Text>
        ) : null}

        {result.unlockedCodes.map((code) => {
          const achievement = ACHIEVEMENT_LABELS[code];
          if (!achievement) return null;
          return (
            <Card key={code} style={styles.achievementCard}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <Text style={typography.bodyStrong}>Conquista desbloqueada: {achievement.title}</Text>
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
        <Button label="Voltar para Hoje" variant="ghost" onPress={() => router.replace('/(tabs)')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[typography.title, styles.pageTitle]}>{content.title}</Text>

        {content.passage_reference && content.youversion_version_id ? (
          <BibleReferenceCard
            reference={content.passage_reference}
            versionId={content.youversion_version_id}
            style={styles.sectionCard}
          />
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>TEXTO EXPLICATIVO</Text>
          <Text style={typography.body}>{content.body}</Text>
        </Card>

        {content.application_text ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>APLICAÇÃO</Text>
            <Text style={typography.body}>{content.application_text}</Text>
          </Card>
        ) : null}

        {content.challenge_text ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>DESAFIO</Text>
            <Text style={typography.body}>{content.challenge_text}</Text>
          </Card>
        ) : null}

        {content.prayer_text ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>ORAÇÃO</Text>
            <Text style={[typography.body, styles.prayerText]}>{content.prayer_text}</Text>
          </Card>
        ) : null}

        <Card style={[styles.sectionCard, styles.reflectionCard]}>
          <Text style={typography.bodyStrong}>Quer registrar uma reflexão? (opcional)</Text>
          <TextField
            label="Sua reflexão"
            placeholder="O que ficou com você hoje..."
            value={reflection}
            onChangeText={setReflection}
            multiline
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label="Concluir meu devocional"
          onPress={handleComplete}
          disabled={completing || !session}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 0,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.ink,
    textAlign: 'center',
  },
  pageTitle: {
    marginBottom: spacing.md,
  },
  // marginBottom explícito em vez de confiar só no gap do ScrollView —
  // mais previsível entre plataformas e permite espaçamento consistente
  // mesmo quando seções opcionais (application/challenge/prayer) somem.
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.greenDark,
    marginBottom: spacing.sm,
  },
  prayerText: {
    fontStyle: 'italic',
  },
  reflectionCard: {
    gap: spacing.sm,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  achievementIcon: {
    fontSize: 28,
  },
  errorText: {
    ...typography.caption,
    color: '#E05252',
    marginBottom: spacing.sm,
  },
});
