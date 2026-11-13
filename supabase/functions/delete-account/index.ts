// Lumi — exclui a conta de quem chama (política de privacidade §5).
//
// Fluxo: o app manda o JWT da pessoa; aqui valida quem é, e chama a exclusão do Supabase Auth com a chave de serviço.
// Antes de a linha de auth.users sair, o gatilho prepare_user_deletion (migration 00036) passa o círculo ao membro mais
// antigo, passa o desafio próprio a quem começou primeiro e guarda denúncias sem identificar a pessoa; o resto sai em
// cascata. IMPORTANTE: só publique esta função DEPOIS de aplicar a migration 00036, senão a exclusão apagaria círculos
// de outras pessoas.
// O corpo precisa ter { "confirm": true } (a tela pede para a pessoa digitar a palavra de confirmação).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'unauthenticated' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return jsonResponse({ error: 'unauthenticated' }, 401);

  let body: { confirm?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }
  if (body.confirm !== true) return jsonResponse({ error: 'confirmation_required' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.warn('delete-account falhou:', error.message);
    return jsonResponse({ error: 'delete_failed' }, 500);
  }
  return jsonResponse({ ok: true });
});
