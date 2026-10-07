-- Lumi — endurecimento de segurança e correção de sequência (streak) / XP.
--
-- Resultado da auditoria de backend:
--   1. O cliente podia dar XP, sequência e conquistas a si mesmo por escrita direta
--      (policies de INSERT/UPDATE em streaks, xp_events, user_achievements). XP e streak medem
--      constância (briefing §7.1): só as funções SECURITY DEFINER devem escrevê-los.
--   2. profiles.timezone nunca era preenchido e podia ser alterado livremente: agora só muda por
--      set_user_timezone, que valida o fuso.
--   3. complete_devotional_session dava XP em dobro quando last_completed_date estava no futuro
--      (troca de fuso), regravava sessões já concluídas e, sem linha em streaks, concedia XP sem
--      limite.
--   4. complete_onboarding aceitava p_age_range nulo.
--
-- Seguro de aplicar com o app antigo no ar: o cliente só escreve em devotional_sessions (insert de
-- user_id/content_id), prayer_entries e notification_preferences, que continuam permitidos.

-- ---------------------------------------------------------------------------
-- 0) Garante a linha de streak de quem foi criado antes do trigger handle_new_user
-- ---------------------------------------------------------------------------
insert into public.streaks (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 1) Fecha a escrita direta em XP / streak / conquistas / sessão concluída
-- ---------------------------------------------------------------------------
drop policy if exists "streaks_insert_own" on public.streaks;
drop policy if exists "streaks_update_own" on public.streaks;
drop policy if exists "xp_events_insert_own" on public.xp_events;
drop policy if exists "user_achievements_insert_own" on public.user_achievements;
drop policy if exists "devotional_sessions_update_own" on public.devotional_sessions;

revoke insert, update, delete on public.streaks from anon, authenticated;
revoke insert, update, delete on public.xp_events from anon, authenticated;
revoke insert, update, delete on public.user_achievements from anon, authenticated;

-- Sessão: o cliente só pode abrir uma (user_id + content_id); concluir é via RPC.
revoke insert, update on public.devotional_sessions from anon, authenticated;
grant insert (user_id, content_id) on public.devotional_sessions to authenticated;

-- Perfil: nome, faixa etária e horário seguem editáveis; o fuso só pela RPC abaixo.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, age_range, preferred_time) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Fuso do usuário (validado), enviado pelo app a cada abertura
-- ---------------------------------------------------------------------------
create or replace function public.set_user_timezone(p_timezone text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if p_timezone is null
     or not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Fuso horário inválido';
  end if;

  update public.profiles
  set timezone = p_timezone,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke execute on function public.set_user_timezone(text) from public;
revoke execute on function public.set_user_timezone(text) from anon;
grant execute on function public.set_user_timezone(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) XP diário só uma vez por sessão (se houver duplicatas antigas, o índice é pulado)
-- ---------------------------------------------------------------------------
do $$
begin
  create unique index if not exists xp_events_daily_moment_once
    on public.xp_events (devotional_session_id, reason)
    where reason = 'daily_moment';
exception when unique_violation then
  raise notice 'xp_events tem duplicatas de daily_moment; índice único não criado.';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) complete_onboarding: faixa etária nula não passa
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_display_name text,
  p_age_range text,
  p_preferred_time time
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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

  if p_age_range is null or p_age_range not in ('kid', 'teen', 'adult', 'senior') then
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

-- ---------------------------------------------------------------------------
-- 5) complete_devotional_session: idempotente e à prova de fuso
-- ---------------------------------------------------------------------------
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
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_user_id uuid;
  v_session_completed_at timestamptz;
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

  select s.user_id, s.completed_at
    into v_session_user_id, v_session_completed_at
  from public.devotional_sessions s
  where s.id = p_session_id;

  if v_session_user_id is null then
    raise exception 'Sessão devocional não encontrada';
  end if;

  if v_session_user_id != v_user_id then
    raise exception 'Sessão devocional pertence a outro usuário';
  end if;

  select coalesce(p.timezone, 'America/Sao_Paulo') into v_user_timezone
  from public.profiles p
  where p.id = v_user_id;

  -- Um fuso inválido gravado por engano não pode impedir o usuário de concluir.
  begin
    v_today := (now() at time zone v_user_timezone)::date;
  exception when others then
    v_today := (now() at time zone 'America/Sao_Paulo')::date;
  end;

  -- Usuário sem linha de streak (criado antes do trigger): cria agora, em vez de dar XP infinito.
  insert into public.streaks (user_id) values (v_user_id) on conflict (user_id) do nothing;

  -- Concluir marca a hora uma única vez; reabrir uma sessão já concluída só pode atualizar a reflexão.
  if v_session_completed_at is null then
    update public.devotional_sessions s
    set completed_at = now(),
        reflection_text = coalesce(p_reflection_text, s.reflection_text)
    where s.id = p_session_id;
  elsif p_reflection_text is not null then
    update public.devotional_sessions s
    set reflection_text = p_reflection_text
    where s.id = p_session_id;
  end if;

  select st.last_completed_date, st.current_streak, st.longest_streak
    into v_last_completed, v_new_streak, v_longest
  from public.streaks st
  where st.user_id = v_user_id
  for update;

  if v_last_completed is not null and v_last_completed >= v_today then
    -- Hoje já contou (inclui data futura por troca de fuso): sem XP, sem mexer na sequência.
    v_xp_awarded := 0;
  else
    if v_last_completed is null or v_last_completed < v_today - 1 then
      v_new_streak := 1;
    else
      v_new_streak := v_new_streak + 1;
    end if;

    v_longest := greatest(v_longest, v_new_streak);

    update public.streaks st
    set current_streak = v_new_streak,
        longest_streak = v_longest,
        last_completed_date = v_today,
        updated_at = now()
    where st.user_id = v_user_id;

    insert into public.xp_events (user_id, amount, reason, devotional_session_id)
    values (v_user_id, v_xp_awarded, 'daily_moment', p_session_id)
    on conflict do nothing;

    select count(*) into v_completed_sessions_count
    from public.devotional_sessions s
    where s.user_id = v_user_id and s.completed_at is not null;

    for v_achievement in
      select a.id, a.code
      from public.achievements a
      where a.code = any(array['first_moment', 'streak_7_days', 'streak_30_days'])
        and not exists (
          select 1 from public.user_achievements ua
          where ua.user_id = v_user_id and ua.achievement_id = a.id
        )
    loop
      if
        (v_achievement.code = 'first_moment' and v_completed_sessions_count >= 1)
        or (v_achievement.code = 'streak_7_days' and v_new_streak >= 7)
        or (v_achievement.code = 'streak_30_days' and v_new_streak >= 30)
      then
        insert into public.user_achievements (user_id, achievement_id)
        values (v_user_id, v_achievement.id)
        on conflict do nothing;

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
