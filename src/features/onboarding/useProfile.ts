import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { useAuth } from '@/features/auth';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      // Falha de rede/servidor: mantém o último profile válido conhecido
      // em vez de sobrescrever com null — RootNavigation não deve jogar um
      // usuário com onboarding já completo de volta pro onboarding só
      // porque uma requisição falhou uma vez.
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setError(null);
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono ao deslogar, sem sistema externo envolvido
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const refetch = useCallback(async () => {
    if (!session) return;
    await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  return { profile, loading, error, refetch };
}
