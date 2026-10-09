// Lumi — envia o push (FCM) dos avisos dos círculos que a própria pessoa acabou de gerar.
//
// Fluxo: o app chama esta função logo depois de torcer / orar / marcar gratidão / compartilhar um
// pedido (as funções do banco da migration 00018 já gravaram os avisos em circle_events). Aqui:
//   1. identifica quem chamou pelo JWT;
//   2. "reivindica" só os avisos DESSA pessoa ainda não enviados (pushed_at nulo, últimos 10 min);
//   3. para cada destinatário que quer os avisos (circles_enabled), manda um push curto, sem o
//      texto do pedido de oração (privacidade na tela bloqueada);
//   4. desativa tokens que o Firebase diz não existirem mais.
// Sem o segredo FCM_SERVICE_ACCOUNT a função não faz nada e não consome os avisos (eles continuam
// aparecendo dentro do app). Passo a passo de configuração: docs/push-setup.md.

import { createClient } from 'jsr:@supabase/supabase-js@2';

type EventKind = 'cheer' | 'prayed' | 'gratitude' | 'new_request';
type Lang = 'pt' | 'en';

type CircleEventRow = {
  id: string;
  recipient_id: string;
  circle_id: string;
  kind: EventKind;
};

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const CLAIM_WINDOW_MINUTES = 10;
const CHANNEL_ID = 'circulos';

const TEXT: Record<
  Lang,
  Record<EventKind, (name: string, circle: string) => string> & {
    many: (count: number) => string;
  }
> = {
  pt: {
    cheer: (name) => `${name} está torcendo por você 💛`,
    prayed: (name) => `${name} orou pelo seu pedido 🙏`,
    gratitude: (name) => `${name} marcou um pedido como atendido. Sua oração fez diferença 💛`,
    new_request: (name, circle) => `${name} compartilhou um pedido de oração em ${circle}`,
    many: (count) => `${count} novidades nos seus círculos`,
  },
  en: {
    cheer: (name) => `${name} is cheering for you 💛`,
    prayed: (name) => `${name} prayed for your request 🙏`,
    gratitude: (name) => `${name} marked a request as answered. Your prayer made a difference 💛`,
    new_request: (name, circle) => `${name} shared a prayer request in ${circle}`,
    many: (count) => `${count} updates in your circles`,
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function base64Url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Troca a conta de serviço do Firebase por um token de acesso (OAuth2 JWT bearer), com cache. */
async function getAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const assertion = `${header}.${claims}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error('fcm_auth_failed');
  const { access_token, expires_in } = await response.json();
  cachedToken = { value: access_token, expiresAt: Date.now() + (expires_in ?? 3600) * 1000 };
  return access_token;
}

/** Devolve 'ok', 'invalid_token' (apague/desative o token) ou 'error'. */
async function sendPush(
  account: ServiceAccount,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  circleId: string,
): Promise<'ok' | 'invalid_token' | 'error'> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { circleId },
          android: { priority: 'NORMAL', notification: { channel_id: CHANNEL_ID } },
        },
      }),
    },
  );
  if (response.ok) return 'ok';
  // 404 (UNREGISTERED) ou 400 que cita o token: aparelho desinstalou o app / token expirou.
  // Qualquer outro 400 seria erro nosso na mensagem, e aí o token não deve ser desativado.
  const detail = await response.text().catch(() => '');
  if (response.status === 404 || /UNREGISTERED|registration token/i.test(detail)) {
    return 'invalid_token';
  }
  return 'error';
}

Deno.serve(async (req) => {
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

  const rawAccount = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!rawAccount) return jsonResponse({ ok: true, sent: 0, reason: 'push_not_configured' });
  let account: ServiceAccount;
  try {
    account = JSON.parse(rawAccount);
    if (!account.project_id || !account.client_email || !account.private_key) throw new Error();
  } catch {
    return jsonResponse({ ok: true, sent: 0, reason: 'push_not_configured' });
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Só os avisos que ESTA pessoa gerou e que ainda não foram enviados; o update marca e devolve
  // numa operação só, então duas chamadas seguidas não enviam o mesmo aviso duas vezes.
  const since = new Date(Date.now() - CLAIM_WINDOW_MINUTES * 60_000).toISOString();
  const { data: claimed, error: claimError } = await admin
    .from('circle_events')
    .update({ pushed_at: new Date().toISOString() })
    .eq('actor_id', user.id)
    .is('pushed_at', null)
    .gte('created_at', since)
    .select('id, recipient_id, circle_id, kind');
  if (claimError) return jsonResponse({ error: 'claim_failed' }, 500);
  const events = (claimed ?? []) as CircleEventRow[];
  if (events.length === 0) return jsonResponse({ ok: true, sent: 0 });

  const { data: actorProfile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  const actorName = actorProfile?.display_name?.trim() || '—';

  const byRecipient = new Map<string, CircleEventRow[]>();
  for (const event of events) {
    byRecipient.set(event.recipient_id, [...(byRecipient.get(event.recipient_id) ?? []), event]);
  }
  const recipientIds = [...byRecipient.keys()];

  const [{ data: prefs }, { data: tokens }, { data: circles }] = await Promise.all([
    admin
      .from('notification_preferences')
      .select('user_id, circles_enabled, language')
      .in('user_id', recipientIds),
    admin
      .from('device_tokens')
      .select('token, user_id')
      .eq('active', true)
      .in('user_id', recipientIds),
    admin
      .from('circles')
      .select('id, name')
      .in('id', [...new Set(events.map((event) => event.circle_id))]),
  ]);
  const circleName = new Map((circles ?? []).map((circle) => [circle.id, circle.name as string]));

  let accessToken: string;
  try {
    accessToken = await getAccessToken(account);
  } catch {
    // Não foi possível autenticar no Firebase: devolve os avisos para a fila, para uma próxima tentativa.
    await admin
      .from('circle_events')
      .update({ pushed_at: null })
      .in(
        'id',
        events.map((event) => event.id),
      );
    return jsonResponse({ ok: false, sent: 0, reason: 'fcm_auth_failed' }, 502);
  }

  let sent = 0;
  const invalidTokens: string[] = [];

  for (const [recipientId, recipientEvents] of byRecipient) {
    const recipientPrefs = (prefs ?? []).find((row) => row.user_id === recipientId);
    if (recipientPrefs && recipientPrefs.circles_enabled === false) continue;
    const lang: Lang = recipientPrefs?.language === 'en' ? 'en' : 'pt';
    const recipientTokens = (tokens ?? []).filter((row) => row.user_id === recipientId);
    if (recipientTokens.length === 0) continue;

    const first = recipientEvents[0];
    const body =
      recipientEvents.length === 1
        ? TEXT[lang][first.kind](actorName, circleName.get(first.circle_id) ?? '')
        : TEXT[lang].many(recipientEvents.length);
    // Vários avisos de círculos diferentes: abre a lista (sem circleId específico não navega).
    const sameCircle = recipientEvents.every((event) => event.circle_id === first.circle_id);

    for (const { token } of recipientTokens) {
      const result = await sendPush(
        account,
        accessToken,
        token,
        'Lumi',
        body,
        sameCircle ? first.circle_id : '',
      );
      if (result === 'ok') sent += 1;
      if (result === 'invalid_token') invalidTokens.push(token);
    }
  }

  if (invalidTokens.length > 0) {
    await admin.from('device_tokens').update({ active: false }).in('token', invalidTokens);
  }

  return jsonResponse({ ok: true, sent });
});
