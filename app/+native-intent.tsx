/**
 * Reescreve os links que chegam de fora do app antes de o roteador usá-los.
 *
 * O login da YouVersion volta para `lumi://callback`: não há tela para esse endereço (o SDK conclui o
 * fluxo sozinho, pela própria janela de login). Sem isto o roteador caía na rota "não encontrada", que
 * voltava ao início e desmontava a tela de login — perdendo o e-mail digitado e a continuação do fluxo.
 * Devolver `null` mantém a pessoa onde estava.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    const target = path
      .split(/[?#]/)[0]
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
      .replace(/^\/+|\/+$/g, '');
    if (target === 'callback') return null;
  } catch {
    // Link estranho: segue o caminho normal.
  }
  return path;
}
