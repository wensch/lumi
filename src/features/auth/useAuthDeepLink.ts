import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

/**
 * Confirmação de signup, magic link e recuperação de senha (Supabase Auth)
 * redirecionam de volta pro app via deep link (emailRedirectTo/redirectTo
 * apontam pra AUTH_REDIRECT_URL). O client Supabase roda com
 * detectSessionInUrl: false (correto para mobile — não existe "URL do
 * browser" pra ele observar sozinho), então este hook captura o link
 * manualmente e estabelece a sessão via setSession. Os tokens vêm no
 * fragment da URL (#access_token=...&type=...), não na query string —
 * por isso o parsing manual em vez de Linking.parse().
 *
 * O fragment também traz "type" (magiclink/signup/recovery). Extraído
 * aqui em vez de depender do evento PASSWORD_RECOVERY do onAuthStateChange
 * porque não há garantia documentada de que esse evento dispare quando a
 * sessão é setada manualmente via setSession (só é documentado para o
 * fluxo automático com detectSessionInUrl: true).
 */
function extractAuthParamsFromUrl(url: string) {
  const fragment = url.split('#')[1] ?? url.split('?')[1];
  if (!fragment) return null;

  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const type = params.get('type');

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, type };
}

async function handleIncomingUrl(url: string | null, onRecovery: () => void) {
  if (!url) return;

  const authParams = extractAuthParamsFromUrl(url);
  if (!authParams) return;

  const { access_token, refresh_token, type } = authParams;
  await supabase.auth.setSession({ access_token, refresh_token });

  if (type === 'recovery') {
    onRecovery();
  }
}

export const AUTH_REDIRECT_URL = Linking.createURL('auth/callback');

export function useAuthDeepLink(onRecovery: () => void) {
  useEffect(() => {
    Linking.getInitialURL().then((url) => handleIncomingUrl(url, onRecovery));

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url, onRecovery);
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onRecovery é setIsPasswordRecovery(true), estável por vir de useState
  }, []);
}
