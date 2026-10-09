import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { cancelDailyReminder } from '@/features/notifications/scheduleDailyReminder';
import { unregisterPushToken } from '@/features/notifications/pushToken';
import { AUTH_REDIRECT_URL, useAuthDeepLink } from './useAuthDeepLink';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  /** true quando o usuário chegou via link de recuperação de senha e ainda não definiu a nova. */
  isPasswordRecovery: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useAuthDeepLink(setIsPasswordRecovery);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isPasswordRecovery,
      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUpWithPassword: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: AUTH_REDIRECT_URL },
        });
        // Quando a confirmação de email está ativa, signUp cria o usuário
        // mas não retorna sessão — sem isso, a tela mostrava sucesso como
        // se o login já tivesse funcionado, e o usuário ficava sem saber
        // que precisava confirmar o email antes de entrar.
        const needsEmailConfirmation = !error && !data.session && !!data.user;
        // Com a proteção contra enumeração de emails, cadastrar um email que já existe
        // "dá certo" sem erro, mas volta um usuário sem identidades (e nenhum email é enviado).
        if (!error && data.user && data.user.identities?.length === 0) {
          return { error: 'User already registered', needsEmailConfirmation: false };
        }
        return { error: error?.message ?? null, needsEmailConfirmation };
      },
      signInWithMagicLink: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: AUTH_REDIRECT_URL },
        });
        return { error: error?.message ?? null };
      },
      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: AUTH_REDIRECT_URL,
        });
        return { error: error?.message ?? null };
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (!error) {
          setIsPasswordRecovery(false);
        }
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        // Os lembretes ficam agendados no aparelho, não na conta: sem isso continuariam
        // chegando depois de sair (e outra conta herdaria o horário da anterior).
        await cancelDailyReminder().catch(() => {});
        // Precisa da sessão ainda ativa: depois do signOut o servidor não saberia de quem é o token.
        await unregisterPushToken();
        setIsPasswordRecovery(false);
        await supabase.auth.signOut();
      },
    }),
    [session, loading, isPasswordRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
