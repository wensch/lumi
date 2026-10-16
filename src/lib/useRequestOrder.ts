import { useMemo, useRef } from 'react';

/**
 * Ordena respostas de buscas repetidas (ao voltar para a tela, depois de uma ação, troca de conta):
 * só a busca mais recente vale; uma resposta antiga que chega depois é ignorada em vez de
 * sobrescrever o dado novo.
 *
 *   const order = useRequestOrder();
 *   const ticket = order.next();
 *   const result = await fetchSomething();
 *   if (!order.isLatest(ticket)) return;
 */
export function useRequestOrder() {
  const counter = useRef(0);
  return useMemo(
    () => ({
      next: () => {
        counter.current += 1;
        return counter.current;
      },
      isLatest: (ticket: number) => ticket === counter.current,
    }),
    [],
  );
}
