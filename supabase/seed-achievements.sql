-- Lumi — catálogo inicial de conquistas (briefing §6: "primeiro momento,
-- 7 dias, 30 dias"). Seed de dados, não é uma migration de schema —
-- rodar manualmente via `supabase db query --linked --file`.

insert into public.achievements (code, title, description, icon, sort_order)
values
  ('first_moment', 'Primeiro momento', 'Você completou seu primeiro momento com o Lumi.', '🌱', 1),
  ('streak_7_days', '7 dias seguidos', 'Uma semana de constância — o Lumi está orgulhoso.', '🔥', 2),
  ('streak_30_days', '30 dias seguidos', 'Um mês inteiro de constância.', '🏆', 3)
on conflict (code) do nothing;
