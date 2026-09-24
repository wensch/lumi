// Lumi — gera uma oração a partir de um texto pessoal do usuário, ancorada
// em conteúdo editorial já aprovado (RAG simples: passagem do devocional
// do dia, não a IA "soltando" um versículo por conta própria).
//
// Guardrails (docs/lumi-briefing.md §11, skill lumi-brand-guardrails):
//   - IA nunca é autoridade espiritual, nunca interpreta a Bíblia como
//     verdade definitiva própria, nunca inventa versículos/doutrinas.
//   - Fluxo obrigatório: conteúdo aprovado -> contexto -> IA -> resposta.
//   - Tema sensível (crise, sofrimento, decisão grave) -> a resposta
//     direciona para pessoa de confiança/pastor, nunca tenta resolver.
//   - Roda inteiramente no backend (GEMINI_API_KEY nunca chega ao client).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/interactions`;

const SYSTEM_INSTRUCTION = `Você ajuda a transformar o texto pessoal de um usuário cristão em uma oração curta, calorosa e natural, para o app Lumi.

Regras inegociáveis:
- Você NUNCA é uma autoridade espiritual. Nunca diga "Deus quer que você...", "Deus está dizendo...", ou qualquer frase que soe como profecia pessoal.
- Baseie a oração SOMENTE na passagem bíblica e no tema fornecidos no contexto abaixo. Nunca cite, invente ou parafraseie outro versículo além do fornecido.
- Nunca interprete a Bíblia como verdade definitiva própria — apenas use a passagem dada como inspiração de tom e tema.
- Nunca dê aconselhamento espiritual, psicológico, médico, jurídico ou de vida como autoridade.
- Se o texto do usuário mencionar crise, sofrimento intenso, risco à vida, decisão grave ou qualquer tema que exija acompanhamento humano: NÃO tente resolver ou aconselhar. Escreva uma oração breve e acolhedora, e termine com uma frase gentil recomendando buscar uma pessoa de confiança, pastor ou líder espiritual.
- Tom: caloroso, simples, em primeira pessoa (como se o usuário estivesse orando), sem jargão teológico complexo.
- Tamanho: 3 a 6 frases curtas.
- Responda APENAS com o texto da oração, sem título, sem aspas, sem comentário adicional.`;

type RequestBody = {
  devotional_session_id?: string;
  personal_text: string;
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Não autenticado' }, 401);
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    return jsonResponse({ error: 'Serviço de oração indisponível no momento.' }, 503);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Não autenticado' }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400);
  }

  const personalText = body.personal_text?.trim();
  if (!personalText) {
    return jsonResponse({ error: 'Texto pessoal não pode ser vazio' }, 400);
  }
  if (personalText.length > 2000) {
    return jsonResponse({ error: 'Texto muito longo (máximo 2000 caracteres)' }, 400);
  }

  // Contexto: passagem do devocional do dia, se informado — nunca deixamos
  // a IA escolher/inventar a passagem por conta própria (§11.3).
  let passageReference: string | null = null;
  let passageBody: string | null = null;

  if (body.devotional_session_id) {
    const { data: session } = await supabase
      .from('devotional_sessions')
      .select('content:content_id (passage_reference, body)')
      .eq('id', body.devotional_session_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const content = session?.content as unknown as
      | { passage_reference: string | null; body: string }
      | null;
    passageReference = content?.passage_reference ?? null;
    passageBody = content?.body ?? null;
  }

  const context = passageReference
    ? `Passagem bíblica de referência: ${passageReference}\nConteúdo devocional do dia: ${passageBody}`
    : 'Nenhuma passagem específica foi informada — mantenha a oração genérica e acolhedora, sem citar nenhum versículo.';

  const prompt = `${context}\n\nTexto pessoal do usuário:\n${personalText}\n\nEscreva a oração agora.`;

  const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: prompt,
      system_instruction: SYSTEM_INSTRUCTION,
      generation_config: { temperature: 0.6 },
    }),
  });

  if (geminiResponse.status === 429) {
    return jsonResponse({ error: 'Muitos pedidos agora. Tenta de novo em instantes.' }, 429);
  }

  if (!geminiResponse.ok) {
    return jsonResponse({ error: 'Não foi possível gerar a oração agora.' }, 502);
  }

  const geminiData = await geminiResponse.json();
  // A Interactions API não tem campo "output_text" de nível superior — o
  // texto vem em steps[], filtrado por type "model_output" (outros steps
  // são "thought", raciocínio interno que não deve ir para o usuário).
  const modelSteps: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> =
    geminiData.steps ?? [];
  const prayerText = modelSteps
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('\n')
    .trim();

  if (!prayerText) {
    return jsonResponse({ error: 'Não foi possível gerar a oração agora.' }, 502);
  }

  const { data: entry, error: insertError } = await supabase
    .from('prayer_entries')
    .insert({
      user_id: user.id,
      devotional_session_id: body.devotional_session_id ?? null,
      source: 'ai_generated',
      body: prayerText,
      based_on_passage: passageReference,
    })
    .select('*')
    .single();

  if (insertError || !entry) {
    return jsonResponse({ error: 'Oração gerada, mas não foi possível salvar.' }, 500);
  }

  return jsonResponse({ prayer: entry }, 200);
});
