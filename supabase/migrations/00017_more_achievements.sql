-- Lumi — mais conquistas (Fase 2, briefing §7.1 e §8.7).
--
-- De 3 para 14 conquistas, todas de constância e de caminhar junto — nenhuma mede "nível de fé":
-- sequências (3, 7, 14, 30, 50, 100 dias), momentos feitos (10, 50, 100), primeira reflexão escrita,
-- recomeço (voltar depois de 3 dias ou mais), primeiro círculo e primeira torcida.
-- Cada uma vale +20 XP e é avaliada ao concluir o momento do dia, dentro de
-- complete_devotional_session (mesma assinatura e retorno da 00016: CREATE OR REPLACE basta).

insert into public.achievements (code, title, description, icon, sort_order)
values
  ('first_moment', 'Primeiro momento', 'Você completou seu primeiro momento com o Lumi.', '🌱', 1),
  ('streak_3_days', '3 dias seguidos', 'Três dias seguidos — o hábito está nascendo.', '✨', 2),
  ('streak_7_days', '7 dias seguidos', 'Uma semana de constância — o Lumi está orgulhoso.', '🔥', 3),
  ('moments_10', '10 momentos', 'Dez momentos com o Lumi.', '📖', 4),
  ('streak_14_days', '14 dias seguidos', 'Duas semanas de constância.', '🌟', 5),
  ('first_reflection', 'Primeira reflexão', 'Você escreveu sua primeira reflexão.', '✍️', 6),
  ('streak_30_days', '30 dias seguidos', 'Um mês inteiro de constância.', '🏆', 7),
  ('comeback', 'Recomeço', 'Voltar depois de alguns dias também é constância.', '🌈', 8),
  ('first_circle', 'Caminhar junto', 'Você entrou no seu primeiro círculo.', '🤝', 9),
  ('first_cheer', 'Primeira torcida', 'Você torceu por alguém do seu círculo.', '💛', 10),
  ('moments_50', '50 momentos', 'Cinquenta momentos com o Lumi.', '📚', 11),
  ('streak_50_days', '50 dias seguidos', 'Cinquenta dias de constância.', '🏅', 12),
  ('streak_100_days', '100 dias seguidos', 'Cem dias seguidos — que caminhada.', '👑', 13),
  ('moments_100', '100 momentos', 'Cem momentos com o Lumi.', '🕊️', 14)
on conflict (code) do update
  set title = excluded.title,
      description = excluded.description,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

create or replace function public.complete_devotional_session(
  p_session_id uuid,
  p_reflection_text text default null
)
returns table (
  current_streak integer,
  longest_streak integer,
  xp_awarded integer,
  unlocked_achievement_codes text[],
  freeze_used boolean,
  freeze_earned boolean,
  freezes_left integer
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
  v_freezes integer;
  v_freeze_used boolean := false;
  v_freeze_earned boolean := false;
  v_missed integer;
  v_xp_awarded integer := 10;
  v_completed_sessions_count integer;
  v_unlocked text[] := array[]::text[];
  v_achievement record;
  v_earned boolean;
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
  -- Sem linha em profiles o fuso vem nulo e a data também: cai no padrão em vez de gravar data nula.
  v_today := coalesce(v_today, (now() at time zone 'America/Sao_Paulo')::date);

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

  select st.last_completed_date, st.current_streak, st.longest_streak, st.freezes
    into v_last_completed, v_new_streak, v_longest, v_freezes
  from public.streaks st
  where st.user_id = v_user_id
  for update;

  if v_last_completed is not null and v_last_completed >= v_today then
    -- Hoje já contou (inclui data futura por troca de fuso): sem XP, sem mexer na sequência.
    v_xp_awarded := 0;
  else
    if v_last_completed is null then
      v_new_streak := 1;
    else
      v_missed := (v_today - v_last_completed) - 1; -- dias inteiros sem momento
      if v_missed <= 0 then
        v_new_streak := v_new_streak + 1;
      elsif v_missed = 1 and v_freezes > 0 then
        v_freezes := v_freezes - 1;
        v_freeze_used := true;
        v_new_streak := v_new_streak + 1;
      else
        v_new_streak := 1;
      end if;
    end if;

    v_longest := greatest(v_longest, v_new_streak);

    -- A cada 7 dias seguidos, ganha uma Folga (guarda até 2).
    if v_new_streak % 7 = 0 and v_freezes < 2 then
      v_freezes := v_freezes + 1;
      v_freeze_earned := true;
    end if;

    update public.streaks st
    set current_streak = v_new_streak,
        longest_streak = v_longest,
        last_completed_date = v_today,
        freezes = v_freezes,
        last_freeze_date = case when v_freeze_used then v_today - 1 else st.last_freeze_date end,
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
      where not exists (
        select 1 from public.user_achievements ua
        where ua.user_id = v_user_id and ua.achievement_id = a.id
      )
    loop
      v_earned := case v_achievement.code
        when 'first_moment' then v_completed_sessions_count >= 1
        when 'streak_3_days' then v_new_streak >= 3
        when 'streak_7_days' then v_new_streak >= 7
        when 'streak_14_days' then v_new_streak >= 14
        when 'streak_30_days' then v_new_streak >= 30
        when 'streak_50_days' then v_new_streak >= 50
        when 'streak_100_days' then v_new_streak >= 100
        when 'moments_10' then v_completed_sessions_count >= 10
        when 'moments_50' then v_completed_sessions_count >= 50
        when 'moments_100' then v_completed_sessions_count >= 100
        when 'first_reflection' then exists (
          select 1 from public.devotional_sessions s
          where s.user_id = v_user_id and s.completed_at is not null
            and nullif(trim(s.reflection_text), '') is not null
        )
        when 'comeback' then coalesce(v_missed, 0) >= 3
        when 'first_circle' then exists (
          select 1 from public.circle_members m where m.user_id = v_user_id
        )
        when 'first_cheer' then exists (
          select 1 from public.circle_cheers c where c.from_user = v_user_id
        )
        else false
      end;

      if v_earned then
        insert into public.user_achievements (user_id, achievement_id)
        values (v_user_id, v_achievement.id)
        on conflict do nothing;

        insert into public.xp_events (user_id, amount, reason, devotional_session_id)
        values (v_user_id, 20, 'achievement', p_session_id);

        v_unlocked := array_append(v_unlocked, v_achievement.code);
      end if;
    end loop;
  end if;

  return query select v_new_streak, v_longest, v_xp_awarded, v_unlocked,
                      v_freeze_used, v_freeze_earned, v_freezes;
end;
$$;

revoke execute on function public.complete_devotional_session(uuid, text) from public;
revoke execute on function public.complete_devotional_session(uuid, text) from anon;
grant execute on function public.complete_devotional_session(uuid, text) to authenticated;
