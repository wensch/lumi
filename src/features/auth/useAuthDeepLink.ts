import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

/**
 * Confirmação de signup e magic link (Supabase Auth) redirecionam de volta
 * pro app via deep link (emailRedirectTo aponta pra AUTH_REDIRECT_URL).
 * O client Supabase roda com detectSessionInUrl: false (correto para
 * mobile — não existe "URL do browser" pra ele observar sozinho), então
 * este hook captura o link manualmente e estabelece a sessão via
 * setSession. Os tokens vêm no fragment da URL (#access_token=...), não
 * na query string — por isso o parsing manual em vez de Linking.parse().
 */
function extractTokensFromUrl(url: string) {
  const fragment = url.split('#')[1] ?? url.split('?')[1];
  if (!fragment) return null;

  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

async function handleIncomingUrl(url: string | null) {
  if (!url) return;

  const tokens = extractTokensFromUrl(url);
  if (!tokens) return;

  await supabase.auth.setSession(tokens);
}

export const AUTH_REDIRECT_URL = Linking.createURL('auth/callback');

export function useAuthDeepLink() {
  useEffect(() => {
    Linking.getInitialURL().then(handleIncomingUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url);
    });

    return () => subscription.remove();
  }, []);
}
