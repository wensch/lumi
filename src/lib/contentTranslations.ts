import { supabase } from '@/lib/supabase';
import type { LanguageCode } from '@/i18n';

/**
 * Traduções do conteúdo editorial (devocionais, planos e desafios) — ver migration 00029.
 * Em português não há tradução (o conteúdo já é português) e nada é buscado. Em inglês, busca uma vez por
 * sessão e guarda; sem rede, o app mostra o português em vez de ficar sem texto.
 */

export type ContentTranslation = {
  title: string;
  body: string;
  application_text: string | null;
  challenge_text: string | null;
  prayer_text: string | null;
};

export type TextTranslation = {
  title: string;
  description: string;
};

export type Translations = {
  /** Por id de conteúdo (cada devocional e dia de plano). */
  content: ReadonlyMap<string, ContentTranslation>;
  plans: ReadonlyMap<string, TextTranslation>;
  challenges: ReadonlyMap<string, TextTranslation>;
};

const EMPTY: Translations = { content: new Map(), plans: new Map(), challenges: new Map() };

const cache = new Map<LanguageCode, Promise<Translations>>();

async function fetchAll(): Promise<Translations> {
  const [content, plans, challenges] = await Promise.all([
    supabase
      .from('content_translations')
      .select('content_id, title, body, application_text, challenge_text, prayer_text')
      .eq('language', 'en'),
    supabase
      .from('reading_plan_translations')
      .select('plan_id, title, description')
      .eq('language', 'en'),
    supabase
      .from('challenge_translations')
      .select('challenge_id, title, description')
      .eq('language', 'en'),
  ]);
  if (content.error || plans.error || challenges.error) throw new Error('translations_unavailable');

  return {
    content: new Map((content.data ?? []).map((row) => [row.content_id, row])),
    plans: new Map((plans.data ?? []).map((row) => [row.plan_id, row])),
    challenges: new Map((challenges.data ?? []).map((row) => [row.challenge_id, row])),
  };
}

/** Traduções do idioma. Falha de rede não fica guardada: a próxima chamada tenta de novo. */
export function loadTranslations(language: LanguageCode): Promise<Translations> {
  if (language === 'pt') return Promise.resolve(EMPTY);
  const cached = cache.get(language);
  if (cached) return cached;
  const request = fetchAll().catch(() => {
    cache.delete(language);
    return EMPTY;
  });
  cache.set(language, request);
  return request;
}

/** Devolve o devocional (ou dia de plano) com os textos traduzidos quando existem. */
export function localizeContent<
  T extends {
    id: string;
    title: string;
    body: string;
    application_text: string | null;
    challenge_text: string | null;
    prayer_text: string | null;
  },
>(item: T, translations: Translations): T {
  const tr = translations.content.get(item.id);
  if (!tr) return item;
  return {
    ...item,
    title: tr.title,
    body: tr.body,
    application_text: tr.application_text,
    challenge_text: tr.challenge_text,
    prayer_text: tr.prayer_text,
  };
}

/** Título e descrição de um plano ou desafio, traduzidos quando existem. */
export function localizeText<
  T extends {
    id?: string;
    plan_id?: string;
    challenge_id?: string;
    title: string;
    description?: string;
  },
>(
  item: T,
  map: ReadonlyMap<string, TextTranslation>,
  key: 'id' | 'plan_id' | 'challenge_id' = 'id',
): T {
  const id = item[key];
  const tr = id ? map.get(id) : undefined;
  if (!tr) return item;
  return { ...item, title: tr.title, description: tr.description };
}
