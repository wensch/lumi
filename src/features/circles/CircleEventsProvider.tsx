import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/features/auth';
import { circlesApi } from './api';
import type { CircleEvent } from './types';

type CircleEventsValue = {
  items: CircleEvent[];
  unread: number;
  refresh: () => Promise<void>;
  /** Marca tudo como lido (chamado ao sair da aba Círculos, depois de a pessoa ter visto a lista). */
  markAllRead: () => Promise<void>;
};

const CircleEventsContext = createContext<CircleEventsValue>({
  items: [],
  unread: 0,
  refresh: async () => {},
  markAllRead: async () => {},
});

/** Avisos dos círculos: busca ao abrir o app, ao voltar do segundo plano e quando chega um push. */
export function CircleEventsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [items, setItems] = useState<CircleEvent[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const result = await circlesApi.events();
    if (result.error) return; // sem rede: mantém o que já tinha
    setItems(result.data.items);
    setUnread(result.data.unread);
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const result = await circlesApi.markEventsRead();
    if (result.error) return;
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setItems([]);
      setUnread(0);
      return;
    }
    refresh();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const received = Notifications.addNotificationReceivedListener(() => {
      refresh();
    });
    return () => {
      appState.remove();
      received.remove();
    };
  }, [userId, refresh]);

  const value = useMemo(
    () => ({ items, unread, refresh, markAllRead }),
    [items, unread, refresh, markAllRead],
  );
  return <CircleEventsContext.Provider value={value}>{children}</CircleEventsContext.Provider>;
}

export function useCircleEvents() {
  return useContext(CircleEventsContext);
}
