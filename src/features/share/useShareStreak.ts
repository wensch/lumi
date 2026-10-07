import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTranslation } from '@/i18n';

export function useShareStreak() {
  const { t } = useTranslation();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = useCallback(async () => {
    if (!cardRef.current) return;

    setSharing(true);
    setError(null);

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        setError(t('errors.shareUnavailable'));
        return;
      }

      const uri = await captureRef(cardRef, {
        result: 'tmpfile',
        format: 'png',
        quality: 1,
        // Tamanho fixo do cartão: sem isso o Android captura em dp × densidade (~3000×5300 px,
        // dezenas de MB) e pode estourar a memória em aparelhos modestos.
        width: 1080,
        height: 1920,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('share.dialogTitle'),
      });
    } catch {
      setError(t('errors.shareFailed'));
    } finally {
      setSharing(false);
    }
  }, [t]);

  return { cardRef, share, sharing, error };
}
