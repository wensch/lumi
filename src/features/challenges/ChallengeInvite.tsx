import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ProgressBar, TextField } from '@/components';
import { InviteShare, normalizeInviteCode } from '@/features/circles';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import { challengesApi, type ChallengeErrorCode } from './api';
import { buildChallengeInviteLink } from './inviteLinks';
import type { Challenge, ChallengeGroupMember, ChallengeInvitePreview } from './types';

/** Quem faz o desafio junto: nome e andamento de cada pessoa (só a contagem do desafio). */
function GroupList({ members }: { members: ChallengeGroupMember[] }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <View style={styles.group}>
      <Text style={styles.caption}>{t('challenges.invite.together')}</Text>
      {members.map((member, index) => {
        const progressText = t('challenges.progress', {
          done: member.progress,
          total: member.target,
        });
        const status =
          member.status === 'completed'
            ? t('challenges.invite.statusCompleted')
            : member.status === 'expired'
              ? t('challenges.invite.statusExpired')
              : member.status === 'abandoned' || member.status === 'none'
                ? t('challenges.invite.statusLeft')
                : progressText;
        const name = member.is_me ? t('challenges.invite.you', { name: member.name }) : member.name;
        return (
          <View key={`${index}-${member.name}`} style={styles.member}>
            <View style={styles.memberHeader}>
              <Text style={theme.typography.bodyStrong} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[theme.typography.caption, styles.muted]}>{status}</Text>
            </View>
            <ProgressBar
              progress={member.target > 0 ? member.progress / member.target : 0}
              accessibilityLabel={`${name}: ${progressText}`}
            />
          </View>
        );
      })}
    </View>
  );
}

/**
 * Convidar alguém para fazer o mesmo desafio (link ou código) e ver quem está junto. Fica dentro do
 * cartão do desafio em andamento.
 */
export function ChallengeInvite({ challenge }: { challenge: Challenge }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ChallengeGroupMember[]>([]);
  const busyRef = useRef(false);

  const groupSize = challenge.group_size ?? 0;
  // Recarrega a lista quando o grupo cresce ou o progresso muda (o cartão é refeito com os dados novos).
  useEffect(() => {
    if (groupSize < 2 && !code) return;
    let cancelled = false;
    challengesApi.groupState(challenge.id).then((result) => {
      if (!cancelled && result.error === null) setMembers(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [challenge.id, challenge.progress, groupSize, code]);

  const invite = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    const result = await challengesApi.createInvite(challenge.id);
    setLoading(false);
    busyRef.current = false;
    if (result.error !== null) {
      Alert.alert(t(`challenges.errors.${result.error}`));
      return;
    }
    setCode(result.data);
  }, [challenge.id, t]);

  return (
    <View style={styles.wrapper}>
      {members.length > 1 ? <GroupList members={members} /> : null}
      {code ? (
        <View style={styles.sharePanel}>
          <Text style={styles.caption}>{t('challenges.invite.codeLabel')}</Text>
          <Text style={styles.code} selectable accessibilityLabel={code.split('').join(' ')}>
            {code}
          </Text>
          <InviteShare
            circleName={challenge.title}
            code={code}
            link={buildChallengeInviteLink(code)}
            text={t('challenges.invite.shareText', { title: challenge.title, code })}
          />
        </View>
      ) : (
        <Button
          label={t('challenges.invite.button')}
          variant="secondary"
          onPress={() => void invite()}
          disabled={loading}
        />
      )}
    </View>
  );
}

type ReceivedProps = {
  code: string;
  onClose: () => void;
  /** Chamado depois de aceitar (para recarregar a lista). */
  onAccepted: () => void | Promise<void>;
};

/** Convite recebido: mostra o desafio e quem convidou, e deixa aceitar. */
export function ChallengeInviteCard({ code, onClose, onAccepted }: ReceivedProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ChallengeInvitePreview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'error' | 'done'>('loading');
  const [accepting, setAccepting] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    challengesApi.invitePreview(code).then((result) => {
      if (cancelled) return;
      if (result.error !== null) {
        setState('error');
        return;
      }
      setPreview(result.data);
      setState(result.data ? 'ready' : 'invalid');
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const accept = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setAccepting(true);
    const result = await challengesApi.acceptInvite(code);
    setAccepting(false);
    busyRef.current = false;
    if (result.error !== null) {
      Alert.alert(t(`challenges.errors.${result.error as ChallengeErrorCode}`));
      return;
    }
    if (!result.data) {
      setState('invalid');
      return;
    }
    setState('done');
    await onAccepted();
  };

  return (
    <Card style={styles.received}>
      <Text style={styles.caption}>{t('challenges.invite.receivedTitle')}</Text>
      {state === 'loading' ? (
        <Text style={theme.typography.body}>{t('common.loading')}</Text>
      ) : state === 'invalid' ? (
        <Text style={theme.typography.body}>{t('challenges.invite.invalid')}</Text>
      ) : state === 'error' ? (
        <Text style={theme.typography.body}>{t('challenges.errors.unknown')}</Text>
      ) : state === 'done' ? (
        <Text style={theme.typography.bodyStrong}>{t('challenges.invite.accepted')}</Text>
      ) : preview ? (
        <>
          <Text style={theme.typography.heading}>{preview.title}</Text>
          <Text style={theme.typography.body}>{preview.description}</Text>
          <Text style={[theme.typography.caption, styles.muted]}>
            {t('challenges.invite.from', { name: preview.inviter_name, count: preview.people })}
            {' · '}
            {t('challenges.inDays', { count: preview.window_days })}
          </Text>
          {preview.joined || preview.already_active ? (
            <Text style={theme.typography.bodyStrong}>{t('challenges.invite.alreadyIn')}</Text>
          ) : (
            <Button
              label={t('challenges.invite.accept')}
              onPress={() => void accept()}
              disabled={accepting}
            />
          )}
        </>
      ) : null}
      <Button label={t('challenges.invite.close')} variant="ghost" onPress={onClose} />
    </Card>
  );
}

/** "Tenho um código": para quando o link não abriu o app. */
export function ChallengeCodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const code = normalizeInviteCode(value);

  return (
    <Card style={styles.received}>
      <TextField
        label={t('challenges.invite.haveCode')}
        placeholder={t('challenges.invite.codePlaceholder')}
        value={value}
        onChangeText={(text) => setValue(text.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        returnKeyType="done"
        onSubmitEditing={() => code && onSubmit(code)}
      />
      <Button
        label={t('challenges.invite.seeInvite')}
        variant="secondary"
        disabled={!code}
        onPress={() => code && onSubmit(code)}
      />
    </Card>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      gap: theme.spacing.sm,
    },
    group: {
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    member: {
      gap: 4,
    },
    memberHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
    },
    caption: {
      ...theme.typography.caption,
      color: theme.colors.ink,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    muted: {
      color: theme.colors.muted,
    },
    sharePanel: {
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderWidth: 2,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
    },
    code: {
      ...theme.typography.heading,
      letterSpacing: 4,
      textAlign: 'center',
    },
    received: {
      gap: theme.spacing.sm,
    },
  });
