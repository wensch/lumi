import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export function useShareStreak() {
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
        setError('Compartilhamento não disponível neste dispositivo.');
        return;
      }

      const uri = await captureRef(cardRef, {
        result: 'tmpfile',
        format: 'png',
        quality: 1,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartilhar minha constância',
      });
    } catch {
      setError('Não foi possível compartilhar agora. Tenta de novo?');
    } finally {
      setSharing(false);
    }
  }, []);

  return { cardRef, share, sharing, error };
}
