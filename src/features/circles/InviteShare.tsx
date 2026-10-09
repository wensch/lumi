import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  buildInviteLink,
  copyInviteLink,
  shareViaSystem,
  shareViaTelegram,
  shareViaWhatsApp,
} from './inviteLinks';

type InviteShareProps = {
  circleName: string;
  code: string;
};

/** Linha de atalhos para enviar o convite: WhatsApp, Telegram, copiar o link e o menu do sistema. */
export function InviteShare({ circleName, code }: InviteShareProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [linkCopied, setLinkCopied] = useState(false);

  const link = buildInviteLink(code);
  const text = t('circles.shareText', { name: circleName, code });
  const message = `${text}\n${link}`;

  const tap = () => Haptics.selectionAsync().catch(() => {});
  const failed = () => Alert.alert(t('circles.shareFailed'));

  const options = [
    {
      key: 'whatsapp',
      label: t('circles.shareWhatsApp'),
      icon: <FontAwesome5 name="whatsapp" size={26} color={theme.colors.ink} />,
      onPress: async () => {
        if (!(await shareViaWhatsApp(message))) failed();
      },
    },
    {
      key: 'telegram',
      label: t('circles.shareTelegram'),
      icon: <FontAwesome5 name="telegram-plane" size={26} color={theme.colors.ink} />,
      onPress: async () => {
        if (!(await shareViaTelegram(link, text))) failed();
      },
    },
    {
      key: 'link',
      label: linkCopied ? t('circles.shareLinkCopied') : t('circles.shareCopyLink'),
      icon: (
        <Ionicons name={linkCopied ? 'checkmark' : 'link'} size={28} color={theme.colors.ink} />
      ),
      onPress: async () => {
        await copyInviteLink(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      },
    },
    {
      key: 'more',
      label: t('circles.shareMore'),
      icon: <Ionicons name="share-social" size={26} color={theme.colors.ink} />,
      onPress: () => shareViaSystem(message),
    },
  ];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>{t('circles.shareVia')}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => {
              tap();
              option.onPress();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            {option.icon}
            <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      gap: theme.spacing.sm,
    },
    heading: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 4,
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: 18,
    },
    optionPressed: {
      opacity: 0.7,
    },
    label: {
      ...theme.typography.caption,
      fontSize: 12,
      color: theme.colors.ink,
    },
  });
