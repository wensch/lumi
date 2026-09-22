/**
 * Traduz as mensagens mais comuns do Supabase Auth (em inglês, técnicas)
 * para copy em português adequada ao usuário final. Mensagens não
 * mapeadas caem num fallback genérico em vez de vazar o erro cru.
 */
const KNOWN_ERRORS: { match: RegExp; message: string }[] = [
  { match: /invalid.*email/i, message: 'Email inválido.' },
  { match: /invalid login credentials/i, message: 'Email ou senha incorretos.' },
  {
    match: /email.*already.*registered|user already registered/i,
    message: 'Já existe uma conta com esse email.',
  },
  {
    match: /password.*should be at least/i,
    message: 'A senha precisa ter pelo menos 6 caracteres.',
  },
  {
    match: /email not confirmed/i,
    message: 'Confirme seu email antes de entrar — verifique sua caixa de entrada.',
  },
  {
    match: /rate limit/i,
    message: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
  },
  { match: /network/i, message: 'Sem conexão. Verifique sua internet e tente de novo.' },
];

export function translateAuthError(rawMessage: string): string {
  const match = KNOWN_ERRORS.find((entry) => entry.match.test(rawMessage));
  return match?.message ?? 'Algo deu errado. Tente de novo em instantes.';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
