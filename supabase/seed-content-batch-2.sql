-- Lumi — 3 devocionais adicionais, escritos em resposta ao feedback do
-- agente de teste diário (2 dias seguidos apontaram repetição de conteúdo
-- com só 1 devocional no catálogo). Revisados contra o checklist da skill
-- lumi-brand-guardrails:
--   1. Sem culpa/vergonha/pressão espiritual em nenhum dos três.
--   2. Nenhum fala como se fosse Deus nem interpreta a passagem como
--      verdade definitiva própria — cada um só convida a uma reflexão.
--   3. Sem humor aqui (são reflexões, não falas do Lumi); nada ridiculariza
--      fé, Deus ou a Bíblia.
--   4. Baseados em passagens reais (Salmos 46:10, Filipenses 4:6-7,
--      Mateus 6:34).
--   5. Nenhum é tema sensível que exija direcionar a acompanhamento humano.

insert into public.content (title, body, passage_reference, youversion_version_id, published_at)
values
(
  'Parar não é perder tempo',
  'Salmos 46:10 traz um convite direto: "aquietai-vos". Não fala de produzir ' ||
  'mais, orar mais bonito ou entender mais rápido — fala de parar. Se seu dia ' ||
  'foi corrido e esse momento aqui é o único respiro que você teve, ele já ' ||
  'cumpriu o que precisava cumprir. Não precisa render mais do que isso.',
  'PSA.46.10',
  3034,
  now()
),
(
  'Ansiedade não é falta de fé',
  'Filipenses 4:6-7 fala em entregar as preocupações em oração, "em tudo". ' ||
  'Não é uma régua de quão ansioso você tem o direito de estar — é um convite ' ||
  'a colocar o peso em algum lugar em vez de carregar sozinho. Se hoje a ' ||
  'cabeça está cheia, isso não te desqualifica de nada. É exatamente pra ' ||
  'esses dias que o texto foi escrito.',
  'PHP.4.6',
  3034,
  now()
),
(
  'Hoje basta a si mesmo',
  'Mateus 6:34 diz para não se afligir com o amanhã, porque "o dia de amanhã ' ||
  'trará as suas próprias preocupações". Não é sobre ignorar o futuro — é ' ||
  'sobre não carregar o peso de todos os dias de uma vez só. Você não ' ||
  'precisa resolver a semana inteira agora. Só esse momento, hoje, já é ' ||
  'suficiente.',
  'MAT.6.34',
  3034,
  now()
);
