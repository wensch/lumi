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
