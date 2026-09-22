-- Lumi — devocional placeholder para popular o fluxo técnico da Fase 1.
-- Texto curto, sem intenção de ser conteúdo editorial final — só o
-- suficiente para testar o fluxo de leitura + reflexão + conclusão.
-- Revisado contra o checklist da skill lumi-brand-guardrails:
--   1. Sem culpa/vergonha — foco em recomeço, não em punição.
--   2. Reflexão não fala como se fosse Deus nem interpreta o texto como
--      verdade definitiva própria — só convida a um pensamento.
--   3. Sem humor aqui (é reflexão, não fala do Lumi); nada ridiculariza fé.
--   4. Baseado em passagem real (Lamentações 3:22-23).
--   5. Não é tema sensível que exija direcionar a acompanhamento humano.

insert into public.content (title, body, passage_reference, youversion_version_id, published_at)
values (
  'Recomeçar não é fracassar',
  'Lamentações 3:22-23 fala de misericórdias que se renovam a cada manhã. ' ||
  'Não fala de méritos acumulados, nem de uma sequência perfeita — fala de ' ||
  'algo que volta a cada novo dia, independente do dia anterior. Se você ' ||
  'está retomando esse momento depois de um tempo fora, hoje conta tanto ' ||
  'quanto qualquer outro dia. Não precisa compensar o que ficou pra trás, ' ||
  'só começar de novo.',
  'LAM.3.22',
  3034,
  now()
);
