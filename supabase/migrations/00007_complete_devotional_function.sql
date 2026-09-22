-- Lumi — função atômica para concluir um momento devocional: marca a
-- sessão como concluída, atualiza streak (idempotente por dia) e credita
-- XP, tudo em uma transação. Evita coordenar 3 escritas separadas do
-- client (race condition, escrita parcial em caso de erro no meio).
--
-- security definer + search_path fixo: roda com privilégio do owner para
-- poder escrever em streaks/xp_events, mas valida auth.uid() = p_user_id
-- internamente, então continua respeitando "cada usuário só mexe no
-- próprio dado" mesmo passando por cima do RLS de leitura/escrita direta.

create function public.complete_devotional_session(
  p_session_id uuid,
  p_reflection_text text default null
)
returns table (
  current_streak integer,
  longest_streak integer,
  xp_awarded integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_user_id uuid;
  v_today date := current_date;
  v_last_completed date;
  v_new_streak integer;
  v_longest integer;
  v_xp_awarded integer := 10;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  select user_id into v_session_user_id
  from public.devotional_sessions
  where id = p_session_id;

  if v_session_user_id is null then
    raise exception 'Sessão devocional não encontrada';
  end if;

  if v_session_user_id != v_user_id then
    raise exception 'Sessão devocional pertence a outro usuário';
  end if;

  update public.devotional_sessions
  set completed_at = now(),
      reflection_text = coalesce(p_reflection_text, reflection_text)
  where id = p_session_id;

  select last_completed_date, streaks.current_streak, streaks.longest_streak
    into v_last_completed, v_new_streak, v_longest
  from public.streaks
  where streaks.user_id = v_user_id
  for update;

  if v_last_completed is null or v_last_completed < v_today - 1 then
    v_new_streak := 1;
  elsif v_last_completed = v_today - 1 then
    v_new_streak := v_new_streak + 1;
  end if;
  -- v_last_completed = v_today: já concluiu hoje, streak não muda (idempotente)

  v_longest := greatest(v_longest, v_new_streak);

  update public.streaks
  set current_streak = v_new_streak,
      longest_streak = v_longest,
      last_completed_date = v_today,
      updated_at = now()
  where streaks.user_id = v_user_id;

  if v_last_completed is distinct from v_today then
    insert into public.xp_events (user_id, amount, reason, devotional_session_id)
    values (v_user_id, v_xp_awarded, 'daily_moment', p_session_id);
  else
    v_xp_awarded := 0;
  end if;

  return query select v_new_streak, v_longest, v_xp_awarded;
end;
$$;

revoke execute on function public.complete_devotional_session(uuid, text) from public;
revoke execute on function public.complete_devotional_session(uuid, text) from anon;
grant execute on function public.complete_devotional_session(uuid, text) to authenticated;

comment on function public.complete_devotional_session is 'Conclui uma sessão devocional: atualiza streak (idempotente por dia) e credita XP em uma transação. XP mede constância, não espiritualidade (briefing §7.1).';
