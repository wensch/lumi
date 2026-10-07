import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

type Profile = Database['public']['Tables']['profiles']['Row'];

type ProfileContextValue = {
  profile: Profile | null;
  /** true até a primeira busca do perfil do usuário atual terminar (com sucesso ou erro). */
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

/**
 * Perfil do usuário logado, numa única instância compartilhada pelo app.
 * Antes era um hook com estado local: a tela de onboarding atualizava a cópia
 * dela, mas o RootNavigation continuava com a antiga (onboarding "incompleto")
 * e mandava o usuário de volta ao onboarding logo depois de concluí-lo.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      // Falha de rede/servidor: mantém o último perfil conhecido em vez de
      // sobrescrever com null — o RootNavigation não deve jogar quem já fez o
      // onboarding de volta para ele só porque uma requisição falhou.
      setError(fetchError.message);
    } else {
      setError(null);
      setProfile(data);
    }
    setLoadedFor(id);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset síncrono ao trocar/deslogar o usuário, sem sistema externo envolvido */
    setProfile(null);
    setError(null);
    setLoadedFor(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!userId) return;
    fetchProfile(userId);
    // session muda de referência a cada onAuthStateChange (inclui
    // TOKEN_REFRESHED silencioso) — depender só de userId evita refazer a busca
    // e derrubar o loading à toa.
  }, [userId, fetchProfile]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    await fetchProfile(userId);
  }, [userId, fetchProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      loading: userId !== null && loadedFor !== userId,
      error,
      refetch,
    }),
    [profile, userId, loadedFor, error, refetch],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile deve ser usado dentro de um ProfileProvider');
  }
  return context;
}
