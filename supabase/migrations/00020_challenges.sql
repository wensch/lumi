-- Lumi — desafios (Fase 4, expansão).
--
-- Desafios são metas curtas de constância, medidas automaticamente pelo que a pessoa já faz no app
-- (momentos, reflexões, torcidas, orações), sem texto editorial novo:
--   * pessoais: "Semana de constância", "Cinco em sete", "Semana de reflexão"...
--   * do círculo: uma meta COLETIVA somada entre as pessoas do círculo (sem ranking, sem nomes).
-- Nenhum desafio cobra culpa: quem não cumpre só vê "terminou, tente de novo quando quiser".
--
-- O progresso é calculado na leitura a partir das tabelas existentes (nada de contadores que possam
-- ficar fora de sincronia). Tabelas fechadas ao cliente; tudo por funções.
-- Não usa DROP nem DELETE, então o conector do Supabase aplica sozinho.

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  icon text,
  scope text not null check (scope in ('personal', 'circle')),
  -- moments_days: dias diferentes com momento; reflections; cheers (torcidas); prayers (orações)
  metric text not null check (metric in ('moments_days', 'reflections', 'cheers', 'prayers')),
  -- personal: meta total; circle: meta POR PESSOA (multiplicada pelo número de pessoas ao começar)
  target integer not null check (target >= 1),
  window_days integer not null check (window_days between 1 and 60),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'abandoned'))
);

create unique index if not exists user_challenges_one_active
  on public.user_challenges (user_id, challenge_id) where status = 'active';
create index if not exists user_challenges_user_idx on public.user_challenges (user_id, started_at desc);

create table if not exists public.circle_challenges (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  started_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  target integer not null check (target >= 1),
  completed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'abandoned'))
);

create unique index if not exists circle_challenges_one_active
  on public.circle_challenges (circle_id) where status = 'active';

alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;
alter table public.circle_challenges enable row level security;
revoke all on public.challenges, public.user_challenges, public.circle_challenges
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cálculo (internas: nenhum cliente chama diretamente)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_metric_value(
  p_metric text,
  p_user uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz text := coalesce((select p.timezone from public.profiles p where p.id = p_user), 'America/Sao_Paulo');
  v_count integer;
begin
  if p_metric = 'moments_days' then
    select count(distinct (s.completed_at at time zone v_tz)::date) into v_count
    from public.devotional_sessions s
    where s.user_id = p_user and s.completed_at >= p_from and s.completed_at < p_to;
  elsif p_metric = 'reflections' then
    select count(*) into v_count
    from public.devotional_sessions s
    where s.user_id = p_user and s.completed_at >= p_from and s.completed_at < p_to
      and nullif(trim(s.reflection_text), '') is not null;
  elsif p_metric = 'cheers' then
    select count(*) into v_count
    from public.circle_cheers c
    where c.from_user = p_user
      and c.day >= (p_from at time zone v_tz)::date and c.day <= (p_to at time zone v_tz)::date;
  elsif p_metric = 'prayers' then
    select count(*) into v_count
    from public.prayer_prayers pp
    where pp.user_id = p_user and pp.created_at >= p_from and pp.created_at < p_to;
  else
    v_count := 0;
  end if;
  return coalesce(v_count, 0);
end;
$$;

-- Atualiza os desafios pessoais ativos: conclui quando bate a meta, expira quando acaba o prazo.
create or replace function public.refresh_user_challenges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
  v_value integer;
begin
  for v_row in
    select uc.id, uc.started_at, uc.ends_at, c.metric, c.target
    from public.user_challenges uc
    join public.challenges c on c.id = uc.challenge_id
    where uc.user_id = p_user and uc.status = 'active'
  loop
    v_value := public.challenge_metric_value(
      v_row.metric, p_user, v_row.started_at, greatest(v_row.ends_at, now()) + interval '1 second'
    );
    if v_value >= v_row.target then
      update public.user_challenges set status = 'completed', completed_at = now() where id = v_row.id;
    elsif now() > v_row.ends_at then
      update public.user_challenges set status = 'expired' where id = v_row.id;
    end if;
  end loop;
end;
$$;

-- Soma da meta do círculo entre as pessoas que são do círculo agora.
create or replace function public.circle_challenge_value(p_circle_id uuid, p_challenge_id uuid, p_from timestamptz, p_to timestamptz)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(public.challenge_metric_value(c.metric, m.user_id, p_from, p_to)), 0)::integer
  from public.challenges c, public.circle_members m
  where c.id = p_challenge_id and m.circle_id = p_circle_id;
$$;

create or replace function public.refresh_circle_challenge(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
  v_value integer;
begin
  for v_row in
    select cc.id, cc.challenge_id, cc.started_at, cc.ends_at, cc.target
    from public.circle_challenges cc
    where cc.circle_id = p_circle_id and cc.status = 'active'
  loop
    v_value := public.circle_challenge_value(
      p_circle_id, v_row.challenge_id, v_row.started_at, greatest(v_row.ends_at, now()) + interval '1 second'
    );
    if v_value >= v_row.target then
      update public.circle_challenges set status = 'completed', completed_at = now() where id = v_row.id;
    elsif now() > v_row.ends_at then
      update public.circle_challenges set status = 'expired' where id = v_row.id;
    end if;
  end loop;
end;
$$;

revoke execute on function public.challenge_metric_value(text, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.refresh_user_challenges(uuid) from public, anon, authenticated;
revoke execute on function public.circle_challenge_value(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.refresh_circle_challenge(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Desafios pessoais
-- ---------------------------------------------------------------------------
create or replace function public.list_challenges()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  perform public.refresh_user_challenges(v_user_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'title', c.title,
        'description', c.description,
        'icon', c.icon,
        'target', c.target,
        'window_days', c.window_days,
        'state', case when a.id is not null then 'active' else 'available' end,
        'progress', case when a.id is not null then
          least(public.challenge_metric_value(c.metric, v_user_id, a.started_at, greatest(a.ends_at, now()) + interval '1 second'), c.target)
          else 0 end,
        'ends_at', a.ends_at,
        'last_status', (
          select uc.status from public.user_challenges uc
          where uc.user_id = v_user_id and uc.challenge_id = c.id and uc.status in ('completed', 'expired')
          order by uc.started_at desc limit 1
        ),
        'completed_count', (
          select count(*) from public.user_challenges uc
          where uc.user_id = v_user_id and uc.challenge_id = c.id and uc.status = 'completed'
        )
      )
      order by (a.id is null), c.sort_order, c.title
    )
    from public.challenges c
    left join public.user_challenges a
      on a.challenge_id = c.id and a.user_id = v_user_id and a.status = 'active'
    where c.scope = 'personal' and c.published_at is not null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.start_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_window integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select c.window_days into v_window
  from public.challenges c
  where c.id = p_challenge_id and c.scope = 'personal' and c.published_at is not null;
  if v_window is null then raise exception 'not_found'; end if;

  perform public.refresh_user_challenges(v_user_id);

  if exists (
    select 1 from public.user_challenges
    where user_id = v_user_id and challenge_id = p_challenge_id and status = 'active'
  ) then
    return; -- já está em andamento
  end if;

  if (select count(*) from public.user_challenges where user_id = v_user_id and status = 'active') >= 3 then
    raise exception 'too_many_active';
  end if;

  insert into public.user_challenges (user_id, challenge_id, ends_at)
  values (v_user_id, p_challenge_id, now() + make_interval(days => v_window));
end;
$$;

create or replace function public.abandon_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.user_challenges
  set status = 'abandoned'
  where user_id = auth.uid() and challenge_id = p_challenge_id and status = 'active';
end;
$$;

-- ---------------------------------------------------------------------------
-- Desafios do círculo (metas coletivas, sem ranking)
-- ---------------------------------------------------------------------------
create or replace function public.circle_challenge_state(p_circle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_active jsonb;
  v_last text;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if not public.is_circle_member(p_circle_id, v_user_id) then raise exception 'not_member'; end if;

  perform public.refresh_circle_challenge(p_circle_id);

  select jsonb_build_object(
    'id', cc.id,
    'challenge_id', c.id,
    'title', c.title,
    'description', c.description,
    'icon', c.icon,
    'target', cc.target,
    'progress', least(
      public.circle_challenge_value(p_circle_id, c.id, cc.started_at, greatest(cc.ends_at, now()) + interval '1 second'),
      cc.target
    ),
    'ends_at', cc.ends_at
  )
  into v_active
  from public.circle_challenges cc
  join public.challenges c on c.id = cc.challenge_id
  where cc.circle_id = p_circle_id and cc.status = 'active';

  select cc.status into v_last
  from public.circle_challenges cc
  where cc.circle_id = p_circle_id and cc.status in ('completed', 'expired')
  order by cc.started_at desc limit 1;

  return jsonb_build_object(
    'active', v_active,
    'last_status', v_last,
    'completed_count', (
      select count(*) from public.circle_challenges cc
      where cc.circle_id = p_circle_id and cc.status = 'completed'
    ),
    'available', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'title', c.title,
          'description', c.description,
          'icon', c.icon,
          'window_days', c.window_days,
          'target', c.target * (select count(*) from public.circle_members m where m.circle_id = p_circle_id)
        )
        order by c.sort_order, c.title
      )
      from public.challenges c
      where c.scope = 'circle' and c.published_at is not null
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.start_circle_challenge(p_circle_id uuid, p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_window integer;
  v_per_member integer;
  v_members integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if not public.is_circle_member(p_circle_id, v_user_id) then raise exception 'not_member'; end if;

  select c.window_days, c.target into v_window, v_per_member
  from public.challenges c
  where c.id = p_challenge_id and c.scope = 'circle' and c.published_at is not null;
  if v_window is null then raise exception 'not_found'; end if;

  perform public.refresh_circle_challenge(p_circle_id);

  if exists (
    select 1 from public.circle_challenges where circle_id = p_circle_id and status = 'active'
  ) then
    raise exception 'already_active';
  end if;

  select count(*) into v_members from public.circle_members where circle_id = p_circle_id;

  insert into public.circle_challenges (circle_id, challenge_id, started_by, ends_at, target)
  values (p_circle_id, p_challenge_id, v_user_id, now() + make_interval(days => v_window), v_per_member * v_members);
end;
$$;

create or replace function public.stop_circle_challenge(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.is_circle_member(p_circle_id, auth.uid()) then raise exception 'not_member'; end if;

  update public.circle_challenges
  set status = 'abandoned'
  where circle_id = p_circle_id and status = 'active';
end;
$$;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.list_challenges()',
    'public.start_challenge(uuid)',
    'public.abandon_challenge(uuid)',
    'public.circle_challenge_state(uuid)',
    'public.start_circle_challenge(uuid, uuid)',
    'public.stop_circle_challenge(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public', v_signature);
    execute format('revoke execute on function %s from anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Conquistas de desafio (avaliadas em complete_devotional_session; ver a parte 2)
-- ---------------------------------------------------------------------------
insert into public.achievements (code, title, description, icon, sort_order)
values
  ('challenge_done', 'Desafio cumprido', 'Você concluiu um desafio pessoal.', '🎯', 16),
  ('challenge_circle', 'Juntos até o fim', 'Seu círculo concluiu um desafio coletivo.', '🌟', 17)
on conflict (code) do update
  set title = excluded.title, description = excluded.description,
      icon = excluded.icon, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Parte 2: complete_devotional_session fecha desafios pessoais e avalia as conquistas de desafio
-- (mesma assinatura e retorno da 00019: CREATE OR REPLACE basta)
-- ---------------------------------------------------------------------------
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

  -- Primeira conclusão desta sessão: se ela é o próximo dia do plano ativo, o plano avança
  -- (um dia do plano por dia do calendário). Terminar o último dia conclui o plano.
  if v_session_completed_at is null then
    update public.user_reading_plans urp
    set last_day_done = urp.last_day_done + 1,
        last_day_done_on = v_today,
        completed_at = case
          when urp.last_day_done + 1 >= (
            select count(*) from public.reading_plan_days x where x.plan_id = urp.plan_id
          ) then now()
          else null
        end,
        active = urp.last_day_done + 1 < (
          select count(*) from public.reading_plan_days x where x.plan_id = urp.plan_id
        )
    from public.reading_plan_days d, public.devotional_sessions s
    where s.id = p_session_id
      and urp.user_id = v_user_id
      and urp.active
      and urp.completed_at is null
      and d.plan_id = urp.plan_id
      and d.day_number = urp.last_day_done + 1
      and d.content_id = s.content_id
      and (urp.last_day_done_on is null or urp.last_day_done_on < v_today);
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
  end if;

  -- Concluir um momento pode fechar um desafio pessoal (momentos em dias diferentes).
  perform public.refresh_user_challenges(v_user_id);

  -- Conquistas são avaliadas a cada conclusão (não só na primeira do dia): terminar um plano ou
  -- entrar num círculo pode acontecer em qualquer momento. XP só entra uma vez por conquista.
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
      when 'plan_completed' then exists (
        select 1 from public.user_reading_plans up
        where up.user_id = v_user_id and up.completed_at is not null
      )
      when 'challenge_done' then exists (
        select 1 from public.user_challenges uc
        where uc.user_id = v_user_id and uc.status = 'completed'
      )
      when 'challenge_circle' then exists (
        select 1 from public.circle_challenges cc
        join public.circle_members m on m.circle_id = cc.circle_id
        where m.user_id = v_user_id and cc.status = 'completed'
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

  return query select v_new_streak, v_longest, v_xp_awarded, v_unlocked,
                      v_freeze_used, v_freeze_earned, v_freezes;
end;
$$;

revoke execute on function public.complete_devotional_session(uuid, text) from public;
revoke execute on function public.complete_devotional_session(uuid, text) from anon;
grant execute on function public.complete_devotional_session(uuid, text) to authenticated;
