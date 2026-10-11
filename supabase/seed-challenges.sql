-- Lumi — desafios iniciais (Fase 4). Metas de constância medidas pelo que a pessoa já faz no app;
-- nenhum texto devocional novo. Rode depois da migration 00020. Seguro repetir.
-- Desafios de círculo: "target" é a meta POR PESSOA (multiplicada pelo número de pessoas ao começar).

insert into public.challenges (slug, title, description, icon, scope, metric, target, window_days, sort_order, published_at)
values
  ('semana-constancia', 'Semana de constância',
   'Faça o momento em 7 dias diferentes nesta semana. Se escapar um, o Lumi entende e você pode tentar de novo.',
   '🔥', 'personal', 'moments_days', 7, 7, 1, now()),
  ('cinco-de-sete', 'Cinco em sete',
   'Faça o momento em 5 dos próximos 7 dias. Sobram 2 dias de folga, sem cobrança.',
   '🌿', 'personal', 'moments_days', 5, 7, 2, now()),
  ('semana-reflexao', 'Semana de reflexão',
   'Escreva 3 reflexões ao final dos seus momentos em 7 dias. Só você vê o que escreve.',
   '✍️', 'personal', 'reflections', 3, 7, 3, now()),
  ('semana-torcida', 'Semana de torcida',
   'Torça por pessoas do seu círculo 3 vezes em 7 dias. Um 💛 faz diferença.',
   '💛', 'personal', 'cheers', 3, 7, 4, now()),
  ('semana-oracao', 'Orar pelos outros',
   'Ore por 3 pedidos de oração do seu círculo em 7 dias.',
   '🙏', 'personal', 'prayers', 3, 7, 5, now()),
  ('mes-vinte', 'Um mês, vinte momentos',
   'Faça o momento em 20 dias dentro de 30 dias. Um mês de caminhada, no seu ritmo.',
   '🗓️', 'personal', 'moments_days', 20, 30, 6, now()),

  ('juntos-semana', 'Juntos por uma semana',
   'O círculo soma 4 momentos por pessoa em 7 dias. É uma meta de todos juntos, sem ranking.',
   '🤝', 'circle', 'moments_days', 4, 7, 1, now()),
  ('juntos-torcida', 'Torcida geral',
   'Cada pessoa torce 2 vezes em 7 dias. Somando, o círculo todo se anima.',
   '💛', 'circle', 'cheers', 2, 7, 2, now()),
  ('juntos-oracao', 'Orando juntos',
   'Cada pessoa ora por 2 pedidos em 7 dias. A meta é do círculo, não de ninguém sozinho.',
   '🙏', 'circle', 'prayers', 2, 7, 3, now())
on conflict (slug) do update
  set title = excluded.title, description = excluded.description, icon = excluded.icon,
      scope = excluded.scope, metric = excluded.metric, target = excluded.target,
      window_days = excluded.window_days, sort_order = excluded.sort_order;
