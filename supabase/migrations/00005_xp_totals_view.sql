-- Lumi — view agregada de XP total por usuário, para não trazer todos os
-- xp_events ao cliente só para somar. RLS da view herda de xp_events
-- (security_invoker), então cada usuário só vê o próprio total.

create view public.xp_totals
with (security_invoker = true)
as
select
  user_id,
  coalesce(sum(amount), 0)::integer as total_xp
from public.xp_events
group by user_id;

comment on view public.xp_totals is 'XP total por usuário, agregado de xp_events. security_invoker garante que RLS de xp_events se aplica.';
