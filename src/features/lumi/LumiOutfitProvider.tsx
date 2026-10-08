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
import { OUTFITS, type OutfitId } from './outfits';

const STORAGE_KEY = 'lumi.outfit';

type OutfitContextValue = {
  outfitId: OutfitId | null;
  setOutfitId: (id: OutfitId | null) => void;
};

const OutfitContext = createContext<OutfitContextValue>({ outfitId: null, setOutfitId: () => {} });

/** Item que o Lumi está vestindo, guardado no aparelho (é preferência visual, não dado da conta). */
export function LumiOutfitProvider({ children }: { children: ReactNode }) {
  const [outfitId, setOutfitIdState] = useState<OutfitId | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (OUTFITS.some((outfit) => outfit.id === stored)) {
          setOutfitIdState(stored as OutfitId);
        }
      })
      .catch(() => {});
  }, []);

  const setOutfitId = useCallback((id: OutfitId | null) => {
    setOutfitIdState(id);
    (id ? AsyncStorage.setItem(STORAGE_KEY, id) : AsyncStorage.removeItem(STORAGE_KEY)).catch(
      () => {},
    );
  }, []);

  const value = useMemo(() => ({ outfitId, setOutfitId }), [outfitId, setOutfitId]);
  return <OutfitContext.Provider value={value}>{children}</OutfitContext.Provider>;
}

export function useLumiOutfit() {
  return useContext(OutfitContext);
}
