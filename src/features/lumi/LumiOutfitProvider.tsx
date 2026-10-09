import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { outfitById, toggleOutfit, type OutfitId } from './outfits';

const STORAGE_KEY = 'lumi.outfits';
/** Versão antiga: um único item guardado como texto. */
const LEGACY_STORAGE_KEY = 'lumi.outfit';

type OutfitContextValue = {
  outfitIds: OutfitId[];
  /** Veste ou tira um item (vestir tira o da mesma categoria). */
  toggleOutfit: (id: OutfitId) => void;
  clearOutfits: () => void;
};

const OutfitContext = createContext<OutfitContextValue>({
  outfitIds: [],
  toggleOutfit: () => {},
  clearOutfits: () => {},
});

function parseStored(raw: string | null): OutfitId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // toggleOutfit garante um item por categoria e descarta ids desconhecidos.
    return parsed.reduce<OutfitId[]>(
      (list, id) =>
        typeof id === 'string' && outfitById(id) ? toggleOutfit(list, id as OutfitId) : list,
      [],
    );
  } catch {
    return [];
  }
}

/** Itens que o Lumi está vestindo, guardados no aparelho (é preferência visual, não dado da conta). */
export function LumiOutfitProvider({ children }: { children: ReactNode }) {
  const [outfitIds, setOutfitIds] = useState<OutfitId[]>([]);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOutfitIds(parseStored(stored));
        return;
      }
      // Migra o item único da versão anterior.
      const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy && outfitById(legacy)) setOutfitIds([legacy as OutfitId]);
    })().catch(() => {});
  }, []);

  const persist = useCallback((next: OutfitId[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const toggle = useCallback(
    (id: OutfitId) => {
      setOutfitIds((current) => {
        const next = toggleOutfit(current, id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearOutfits = useCallback(() => {
    setOutfitIds([]);
    persist([]);
  }, [persist]);

  const value = useMemo(
    () => ({ outfitIds, toggleOutfit: toggle, clearOutfits }),
    [outfitIds, toggle, clearOutfits],
  );
  return <OutfitContext.Provider value={value}>{children}</OutfitContext.Provider>;
}

export function useLumiOutfit() {
  return useContext(OutfitContext);
}
