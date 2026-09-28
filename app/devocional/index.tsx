import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, Section, TextField } from '@/components';
import { ACHIEVEMENT_LABELS } from '@/features/achievements';
import { useDevotional } from '@/features/devotional';
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
      <Screen centered>
        <Text style={typography.body}>Preparando seu devocional…</Text>
      </Screen>
    );
  }

  if (!content) {
    return (
      <Screen centered contentContainerStyle={styles.centeredContent}>
        <Text style={[typography.heading, styles.centeredText]}>
          Ainda não há devocional disponível.
        </Text>
        <Text style={[typography.body, styles.subtitle]}>Volte em breve.</Text>
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
      <Screen centered contentContainerStyle={styles.centeredContent}>
        <LumiMascot mood="celebrating" size={160} />
        <Text style={[typography.heading, styles.centeredText]}>
          {showReturnWelcome ? 'Que bom te ver de novo!' : 'Devocional concluído!'}
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
            <Card key={code} padding="compact" style={styles.achievementCard}>
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
        <Button label="Voltar para Hoje" variant="tertiary" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={typography.title}>{content.title}</Text>

      {content.passage_reference ? (
        <Section label="Versículo">
          <Text style={[typography.heading, styles.verseReference]}>
            {content.passage_reference}
          </Text>
        </Section>
      ) : null}

      <Section label="Texto explicativo">
        <Text style={typography.body}>{content.body}</Text>
      </Section>

      {content.application_text ? (
        <Section label="Aplicação">
          <Text style={typography.body}>{content.application_text}</Text>
        </Section>
      ) : null}

      {content.challenge_text ? (
        <Section label="Desafio">
          <Text style={typography.body}>{content.challenge_text}</Text>
        </Section>
      ) : null}

      {content.prayer_text ? (
        <Section label="Oração">
          <Text style={[typography.body, styles.prayerText]}>{content.prayer_text}</Text>
        </Section>
      ) : null}

      <Section label="Quer registrar uma reflexão? (opcional)">
        <TextField
          label="Sua reflexão"
          placeholder="O que ficou com você hoje..."
          value={reflection}
          onChangeText={setReflection}
          multiline
        />
      </Section>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        label="Concluir meu devocional"
        onPress={handleComplete}
        disabled={completing || !session}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centeredContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  centeredText: {
    textAlign: 'center',
  },
  subtitle: {
    color: colors.ink,
    textAlign: 'center',
  },
  verseReference: {
    color: colors.greenDark,
  },
  prayerText: {
    fontStyle: 'italic',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  achievementIcon: {
    fontSize: 28,
  },
  errorText: {
    ...typography.caption,
    color: '#E05252',
  },
});
