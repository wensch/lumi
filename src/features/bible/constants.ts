import type { LanguageCode } from '@/i18n';

/**
 * Versão bíblica padrão do app: NVI (id 129), licenciada via
 * platform.youversion.com (Biblica Fast-track Bible License). Ponto único
 * de troca — atualizar aqui se a versão padrão mudar no futuro.
 */
export const DEFAULT_BIBLE_VERSION_ID = 129;

/**
 * Versão usada para exibir o versículo de um devocional. Em português é sempre a
 * padrão (NVI): o seed antigo gravou o id 3034 (BSB, inglês) nos conteúdos, e o
 * texto em inglês aparecia embaixo de um devocional em português. Em outros
 * idiomas vale a versão do próprio conteúdo.
 */
export function verseVersionId(contentVersionId: number | null, language: LanguageCode): number {
  if (language === 'pt') return DEFAULT_BIBLE_VERSION_ID;
  return contentVersionId ?? DEFAULT_BIBLE_VERSION_ID;
}
