// Lumi — responde dúvidas do usuário sobre o texto bíblico do devocional
// do dia, ancorada no conteúdo editorial já aprovado (RAG simples:
// passagem + corpo do devocional, nunca a IA "soltando" um versículo ou
// doutrina por conta própria).
//
// Guardrails (docs/lumi-briefing.md §11, skill lumi-brand-guardrails):
//   - IA nunca é autoridade espiritual, nunca interpreta a Bíblia como
//     verdade definitiva própria, nunca inventa versículos/doutrinas.
//   - Fluxo obrigatório: conteúdo aprovado -> contexto -> IA -> resposta.
//   - Tema sensível (crise, sofrimento, decisão grave) -> a resposta
//     direciona para pessoa de confiança/pastor, nunca tenta resolver.
//   - Roda inteiramente no backend (GEMINI_API_KEY nunca chega ao client).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/interactions`;

const SYSTEM_INSTRUCTION = `Você ajuda o usuário a entender melhor a passagem bíblica e o texto devocional do dia, dentro do app Lumi.

Regras inegociáveis:
- Você NUNCA é uma autoridade espiritual. Nunca diga "Deus quer que você...", "Deus está dizendo...", ou qualquer frase que soe como profecia pessoal.
- Responda SOMENTE com base na passagem bíblica e no texto devocional fornecidos no contexto abaixo. Nunca cite, invente ou parafraseie outro versículo além do fornecido. Se a pergunta pedir algo que não está no contexto (outro versículo, outra doutrina), diga que isso está fora do que você pode responder aqui e sugira consultar a Bíblia completa ou um pastor/líder espiritual.
- Nunca interprete a Bíblia como verdade definitiva própria — explique o que o texto diz, sem afirmar ser a única leitura possível.
- Nunca dê aconselhamento espiritual, psicológico, médico, jurídico ou de vida como autoridade.
- Se a pergunta envolver crise, sofrimento intenso, risco à vida, decisão grave ou qualquer tema que exija acompanhamento humano: NÃO tente resolver ou aconselhar. Responda com acolhimento breve e recomende buscar uma pessoa de confiança, pastor ou líder espiritual.
- Tom: claro, simples, conversacional — como um amigo que explica, não uma aula teológica.
- Tamanho: no máximo 4 frases curtas.
- Responda apenas com o texto da explicação, sem saudação, sem repetir a pergunta.`;

type RequestBody = {
  devotional_session_id?: string;
  question: string;
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
    return jsonResponse({ error: 'Serviço indisponível no momento.' }, 503);
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

  const question = body.question?.trim();
  if (!question) {
    return jsonResponse({ error: 'Pergunta não pode ser vazia' }, 400);
  }
  if (question.length > 500) {
    return jsonResponse({ error: 'Pergunta muito longa (máximo 500 caracteres)' }, 400);
  }
  if (!body.devotional_session_id) {
    return jsonResponse({ error: 'devotional_session_id é obrigatório' }, 400);
  }

  // Contexto: passagem + texto do devocional do dia — nunca deixamos a IA
  // escolher/inventar a passagem por conta própria (§11.3).
  const { data: session } = await supabase
    .from('devotional_sessions')
    .select('content:content_id (title, passage_reference, body)')
    .eq('id', body.devotional_session_id)
    .eq('user_id', user.id)
    .maybeSingle();

  const content = session?.content as unknown as
    | { title: string; passage_reference: string | null; body: string }
    | null;

  if (!content) {
    return jsonResponse({ error: 'Devocional não encontrado' }, 404);
  }

  const context = `Título do devocional: ${content.title}\nPassagem bíblica de referência: ${content.passage_reference ?? 'não informada'}\nTexto devocional: ${content.body}`;

  const prompt = `${context}\n\nPergunta do usuário sobre esse texto:\n${question}\n\nResponda agora.`;

  const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: prompt,
      system_instruction: SYSTEM_INSTRUCTION,
      generation_config: { temperature: 0.4 },
    }),
  });

  if (geminiResponse.status === 429) {
    return jsonResponse({ error: 'Muitos pedidos agora. Tenta de novo em instantes.' }, 429);
  }

  if (!geminiResponse.ok) {
    return jsonResponse({ error: 'Não foi possível responder agora.' }, 502);
  }

  const geminiData = await geminiResponse.json();
  // A Interactions API não tem campo "output_text" de nível superior — o
  // texto vem em steps[], filtrado por type "model_output" (outros steps
  // são "thought", raciocínio interno que não deve ir para o usuário).
  const modelSteps: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> =
    geminiData.steps ?? [];
  const answer = modelSteps
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('\n')
    .trim();

  if (!answer) {
    return jsonResponse({ error: 'Não foi possível responder agora.' }, 502);
  }

  return jsonResponse({ answer }, 200);
});
