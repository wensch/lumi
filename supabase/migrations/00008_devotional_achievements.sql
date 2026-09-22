-- Lumi — complete_devotional_session passa a checar e desbloquear
-- conquistas de primeiro momento / 7 dias / 30 dias (briefing §6) na
-- mesma transação que atualiza streak e credita XP.
--
-- Muda o tipo de retorno (nova coluna unlocked_achievement_codes), então
-- precisa dropar antes de recriar — CREATE OR REPLACE não permite mudar
-- o shape de retorno de uma função existente.

drop function if exists public.complete_devotional_session(uuid, text);

create function public.complete_devotional_session(
  p_session_id uuid,
  p_reflection_text text default null
)
returns table (
  current_streak integer,
  longest_streak integer,
  xp_awarded integer,
  unlocked_achievement_codes text[]
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
  v_completed_sessions_count integer;
  v_unlocked text[] := array[]::text[];
  v_achievement record;
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

  -- Conquistas: só checa em conclusões novas do dia (evita reprocessar em
  -- chamadas idempotentes do mesmo dia).
  if v_last_completed is distinct from v_today then
    select count(*) into v_completed_sessions_count
    from public.devotional_sessions
    where user_id = v_user_id and completed_at is not null;

    for v_achievement in
      select id, code
      from public.achievements
      where code = any(array['first_moment', 'streak_7_days', 'streak_30_days'])
        and not exists (
          select 1 from public.user_achievements ua
          where ua.user_id = v_user_id and ua.achievement_id = achievements.id
        )
    loop
      if
        (v_achievement.code = 'first_moment' and v_completed_sessions_count >= 1)
        or (v_achievement.code = 'streak_7_days' and v_new_streak >= 7)
        or (v_achievement.code = 'streak_30_days' and v_new_streak >= 30)
      then
        insert into public.user_achievements (user_id, achievement_id)
        values (v_user_id, v_achievement.id);

        insert into public.xp_events (user_id, amount, reason, devotional_session_id)
        values (v_user_id, 20, 'achievement', p_session_id);

        v_unlocked := array_append(v_unlocked, v_achievement.code);
      end if;
    end loop;
  end if;

  return query select v_new_streak, v_longest, v_xp_awarded, v_unlocked;
end;
$$;

revoke execute on function public.complete_devotional_session(uuid, text) from public;
revoke execute on function public.complete_devotional_session(uuid, text) from anon;
grant execute on function public.complete_devotional_session(uuid, text) to authenticated;

comment on function public.complete_devotional_session is 'Conclui uma sessão devocional: atualiza streak (idempotente por dia), credita XP e desbloqueia conquistas de primeiro momento/7 dias/30 dias, tudo em uma transação. XP mede constância, não espiritualidade (briefing §7.1).';
