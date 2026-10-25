import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Relatório de erros próprio (sem serviço de terceiros): erros não tratados de JavaScript vão para a
 * tabela `app_errors`, sem user_id. O banco ainda limpa aspas, e-mails e links e corta o tamanho.
 * Em desenvolvimento não envia nada (o erro aparece no terminal e na tela vermelha).
 */

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsGlobal = {
  getGlobalHandler: () => GlobalErrorHandler;
  setGlobalHandler: (handler: GlobalErrorHandler) => void;
};

/** Mantém só o que ajuda a achar o problema: tipo do erro e primeira linha, sem o texto digitado. */
function summarize(error: unknown): { message: string; stack: string | null } {
  const err = error instanceof Error ? error : null;
  const firstLine = (err?.message ?? String(error ?? '')).split('\n')[0];
  const stripped = firstLine.replace(/"[^"]*"/g, '"…"').slice(0, 300);
  return {
    message: `${err?.name ?? 'Erro'}: ${stripped}`,
    stack: err?.stack ? err.stack.slice(0, 1500) : null,
  };
}

function report(source: string, error: unknown): void {
  try {
    const { message, stack } = summarize(error);
    supabase
      .rpc('report_app_error', {
        p_source: source,
        p_message: message,
        p_stack: stack ?? undefined,
        p_app_version: Constants.expoConfig?.version ?? undefined,
        p_platform: Platform.OS,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // Relatar erro nunca pode causar outro erro.
  }
}

/** Instala o relatório uma vez, no início do app. Mantém o tratador padrão (o app continua reagindo como antes). */
export function installErrorReporting(): void {
  if (__DEV__) return;
  const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsGlobal }).ErrorUtils;
  if (!errorUtils) return;

  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    report(isFatal ? 'global-fatal' : 'global', error);
    previous(error, isFatal);
  });
}
