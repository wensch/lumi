import type { useTranslation } from '@/i18n';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Traduz as mensagens mais comuns do Supabase Auth (em inglês, técnicas)
 * para copy adequada ao usuário final, no idioma ativo do app. Mensagens
 * não mapeadas caem num fallback genérico em vez de vazar o erro cru.
 */
const KNOWN_ERRORS: { match: RegExp; key: string }[] = [
  { match: /invalid.*email/i, key: 'auth.errorInvalidEmail' },
  { match: /invalid login credentials/i, key: 'auth.errorInvalidCredentials' },
  {
    match: /email.*already.*registered|user already registered/i,
    key: 'auth.errorAlreadyRegistered',
  },
  {
    match: /password.*should be at least/i,
    key: 'auth.errorPasswordTooShort',
  },
  {
    match: /email not confirmed/i,
    key: 'auth.errorEmailNotConfirmed',
  },
  {
    match: /rate limit/i,
    key: 'auth.errorRateLimit',
  },
  { match: /network/i, key: 'auth.errorNetwork' },
];

export function translateAuthError(rawMessage: string, t: Translate): string {
  const match = KNOWN_ERRORS.find((entry) => entry.match.test(rawMessage));
  return t((match?.key ?? 'auth.errorGeneric') as Parameters<Translate>[0]);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
