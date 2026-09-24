-- Lumi — defesa em profundidade adicional em complete_onboarding e
-- complete_devotional_session, em resposta aos avisos do Security Advisor
-- "Signed-In Users Can Execute SECURITY DEFINER Function" (0029).
--
-- Contexto: os avisos são esperados, não bugs — ambas as funções já
-- validam auth.uid() e só escrevem no próprio usuário, o padrão seguro
-- recomendado pelo Supabase para "endpoint público intencional"
-- (https://supabase.com/docs/guides/database/database-linter?lint=0029).
-- Revogar EXECUTE quebraria onboarding e devocional, que dependem dessas
-- RPCs. Esta migration reforça a validação de entrada, para que dados
-- inválidos gerem um erro claro da própria função em vez de estourar um
-- constraint genérico do banco (ou, pior, serem aceitos silenciosamente
-- em algum caminho não coberto por constraint).

drop function if exists public.complete_onboarding(text, text, time);

create function public.complete_onboarding(
  p_display_name text,
  p_age_range text,
  p_preferred_time time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'Nome de exibição não pode ser vazio';
  end if;

  if length(p_display_name) > 100 then
    raise exception 'Nome de exibição muito longo';
  end if;

  if p_age_range not in ('kid', 'teen', 'adult', 'senior') then
    raise exception 'Faixa etária inválida: %', p_age_range;
  end if;

  if p_preferred_time is null then
    raise exception 'Horário preferido não pode ser vazio';
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      age_range = p_age_range,
      preferred_time = p_preferred_time,
      onboarding_completed_at = now(),
      updated_at = now()
  where id = v_user_id;

  update public.notification_preferences
  set preferred_time = p_preferred_time,
      updated_at = now()
  where user_id = v_user_id;
end;
$$;

revoke execute on function public.complete_onboarding(text, text, time) from public;
revoke execute on function public.complete_onboarding(text, text, time) from anon;
grant execute on function public.complete_onboarding(text, text, time) to authenticated;

comment on function public.complete_onboarding is 'Conclui o onboarding atomicamente: profiles + notification_preferences numa única transação. Valida entrada explicitamente (SECURITY DEFINER intencional — ver Security Advisor 0029, mitigado via auth.uid() + validação de input, não via revogação de acesso).';

-- complete_devotional_session: reforça a validação de p_session_id (nulo
-- hoje cairia direto no "sessão não encontrada" pela query, mas um guard
-- explícito deixa a intenção clara e evita uma consulta desnecessária).
create or replace function public.complete_devotional_session(
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
  v_user_timezone text;
  v_today date;
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

  if p_session_id is null then
    raise exception 'ID da sessão devocional não pode ser vazio';
  end if;

  if p_reflection_text is not null and length(p_reflection_text) > 5000 then
    raise exception 'Reflexão muito longa (máximo 5000 caracteres)';
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

  select coalesce(profiles.timezone, 'America/Sao_Paulo') into v_user_timezone
  from public.profiles
  where profiles.id = v_user_id;

  v_today := (now() at time zone v_user_timezone)::date;

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

comment on function public.complete_devotional_session is 'Conclui uma sessão devocional: atualiza streak (idempotente por dia no fuso do usuário), credita XP e desbloqueia conquistas, tudo em uma transação. Valida entrada explicitamente (SECURITY DEFINER intencional — ver Security Advisor 0029, mitigado via auth.uid() + validação de input, não via revogação de acesso). XP mede constância, não espiritualidade (briefing §7.1).';
