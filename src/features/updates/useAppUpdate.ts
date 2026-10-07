import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { CURRENT_BUILD, fetchLatestBuild, isNewerBuild, type LatestBuild } from './appUpdate';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'upToDate' | 'error';

type Options = {
  /** Confere sozinho ao montar (banner da Hoje). Em Configurações a conferência é manual. */
  autoCheck?: boolean;
};

export function useAppUpdate({ autoCheck = false }: Options = {}) {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [latest, setLatest] = useState<LatestBuild | null>(null);

  const check = useCallback(async () => {
    setStatus('checking');
    try {
      const result = await fetchLatestBuild();
      if (isNewerBuild(result)) {
        setLatest(result);
        setStatus('available');
      } else {
        setStatus('upToDate');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // Só APK instalado de um build do CI (CURRENT_BUILD > 0) tem o que atualizar.
    if (autoCheck && Platform.OS === 'android' && CURRENT_BUILD > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara a consulta externa (GitHub) ao montar; o setState é só o "checking" inicial
      check();
    }
  }, [autoCheck, check]);

  /** Abre o download do APK no navegador; ao terminar, o usuário toca no arquivo para instalar. */
  const openDownload = useCallback(() => {
    if (latest) Linking.openURL(latest.apkUrl);
  }, [latest]);

  return { status, latest, currentBuild: CURRENT_BUILD, check, openDownload };
}
