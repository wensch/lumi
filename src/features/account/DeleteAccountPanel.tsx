import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, TextField } from '@/components';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';
import { deleteAccount } from './deleteAccount';

/**
 * "Excluir minha conta e meus dados": explica o que sai, pede para digitar a palavra de confirmação e chama a função de
 * servidor. Ao terminar, a sessão acaba e o app volta para a entrada.
 */
export function DeleteAccountPanel() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [working, setWorking] = useState(false);
  const busyRef = useRef(false);
  const word = t('settings.deleteWord');
  const confirmed = typed.trim().toUpperCase() === word.toUpperCase();

  const run = async () => {
    if (busyRef.current || !confirmed) return;
    busyRef.current = true;
    setWorking(true);
    const result = await deleteAccount();
    // Depois de excluir, o botão continua travado até a tela sair (a sessão acaba logo em seguida).
    if (result === 'error') {
      setWorking(false);
      busyRef.current = false;
      Alert.alert(t('settings.deleteError'));
    }
  };

  if (!open) {
    return (
      <Button
        variant="tertiary"
        label={t('settings.deleteAccount')}
        onPress={() => setOpen(true)}
        accessibilityHint={t('settings.deleteHint')}
      />
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={theme.typography.bodyStrong}>{t('settings.deleteTitle')}</Text>
      <Text style={theme.typography.body}>{t('settings.deleteBody')}</Text>
      <TextField
        label={t('settings.deleteTypeToConfirm', { word })}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!working}
      />
      <Button
        label={working ? t('settings.deleting') : t('settings.deleteConfirm')}
        onPress={() => void run()}
        disabled={!confirmed || working}
      />
      <Button
        variant="ghost"
        label={t('common.cancel')}
        onPress={() => {
          setOpen(false);
          setTyped('');
        }}
        disabled={working}
      />
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      gap: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.danger,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.white,
    },
  });
