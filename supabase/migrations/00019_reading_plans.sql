-- Lumi — planos de leitura (Fase 4, expansão).
--
-- Um plano é uma sequência de dias; cada dia aponta para um devocional JÁ aprovado (tabela content),
-- então plano nenhum cria texto novo. A pessoa pode ter um plano ativo por vez (os outros ficam em
-- pausa, com o progresso guardado). Um dia do plano por dia do calendário: o devocional do dia
-- passa a ser o próximo dia do plano, e concluí-lo avança o plano (dentro de
-- complete_devotional_session). Terminar o plano libera a conquista "Plano concluído".
--
--   reading_plans / reading_plan_days  conteúdo editorial (o cliente só lê pelas funções abaixo)
--   user_reading_plans                 progresso de cada pessoa (só funções escrevem)
--
-- Não usa DROP nem DELETE, então o conector do Supabase aplica sozinho.

create table if not exists public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  icon text,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_plan_days (
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  day_number integer not null check (day_number >= 1),
  content_id uuid not null references public.content (id),
  primary key (plan_id, day_number)
);

create table if not exists public.user_reading_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  active boolean not null default true,
  last_day_done integer not null default 0 check (last_day_done >= 0),
  last_day_done_on date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, plan_id)
);

create index if not exists user_reading_plans_active_idx
  on public.user_reading_plans (user_id) where active;

alter table public.reading_plans enable row level security;
alter table public.reading_plan_days enable row level security;
alter table public.user_reading_plans enable row level security;
revoke all on public.reading_plans, public.reading_plan_days, public.user_reading_plans
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leitura
-- ---------------------------------------------------------------------------
create or replace function public.list_reading_plans()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'title', p.title,
        'description', p.description,
        'icon', p.icon,
        'days', (select count(*) from public.reading_plan_days d where d.plan_id = p.id),
        'status', case
          when u.completed_at is not null then 'done'
          when u.active then 'active'
          when u.user_id is not null then 'paused'
          else 'none'
        end,
        'last_day_done', coalesce(u.last_day_done, 0)
      )
      order by p.sort_order, p.title
    )
    from public.reading_plans p
    left join public.user_reading_plans u on u.plan_id = p.id and u.user_id = v_user_id
    where p.published_at is not null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.reading_plan_detail(p_plan_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.reading_plans;
  v_progress public.user_reading_plans;
  v_today date;
  v_total integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_plan from public.reading_plans p
  where p.id = p_plan_id and p.published_at is not null;
  if v_plan.id is null then raise exception 'not_found'; end if;

  select * into v_progress from public.user_reading_plans u
  where u.user_id = v_user_id and u.plan_id = p_plan_id;

  v_today := public.user_local_date(v_user_id);
  select count(*) into v_total from public.reading_plan_days d where d.plan_id = p_plan_id;

  return jsonb_build_object(
    'id', v_plan.id,
    'title', v_plan.title,
    'description', v_plan.description,
    'icon', v_plan.icon,
    'days', v_total,
    'status', case
      when v_progress.user_id is null then 'none'
      when v_progress.completed_at is not null then 'done'
      when v_progress.active then 'active'
      else 'paused'
    end,
    'last_day_done', coalesce(v_progress.last_day_done, 0),
    'done_today', coalesce(v_progress.last_day_done_on = v_today, false),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', d.day_number,
          'title', c.title,
          'passage_reference', c.passage_reference,
          'state', case
            when d.day_number <= coalesce(v_progress.last_day_done, 0) then 'done'
            when d.day_number = coalesce(v_progress.last_day_done, 0) + 1 then 'next'
            else 'locked'
          end
        )
        order by d.day_number
      )
      from public.reading_plan_days d
      join public.content c on c.id = d.content_id
      where d.plan_id = p_plan_id
    ), '[]'::jsonb)
  );
end;
$$;

-- O plano ativo da pessoa e o devocional do próximo dia (nulo se não há plano ativo).
create or replace function public.active_reading_plan()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  v_today := public.user_local_date(v_user_id);

  select jsonb_build_object(
    'plan_id', p.id,
    'title', p.title,
    'icon', p.icon,
    'days', (select count(*) from public.reading_plan_days x where x.plan_id = p.id),
    'last_day_done', u.last_day_done,
    'next_day', u.last_day_done + 1,
    'content_id', d.content_id,
    'done_today', coalesce(u.last_day_done_on = v_today, false)
  )
  into v_result
  from public.user_reading_plans u
  join public.reading_plans p on p.id = u.plan_id
  join public.reading_plan_days d on d.plan_id = u.plan_id and d.day_number = u.last_day_done + 1
  where u.user_id = v_user_id and u.active and u.completed_at is null;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Começar / pausar
-- ---------------------------------------------------------------------------
create or replace function public.start_reading_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  if not exists (
    select 1 from public.reading_plans p
    where p.id = p_plan_id and p.published_at is not null
  ) or not exists (select 1 from public.reading_plan_days d where d.plan_id = p_plan_id) then
    raise exception 'not_found';
  end if;

  -- Um plano ativo por vez: os outros ficam em pausa, com o progresso guardado.
  update public.user_reading_plans set active = false
  where user_id = v_user_id and active and plan_id <> p_plan_id;

  insert into public.user_reading_plans (user_id, plan_id)
  values (v_user_id, p_plan_id)
  on conflict (user_id, plan_id) do update
    set active = true,
        -- Plano já concluído: começar de novo recomeça do dia 1.
        last_day_done = case when user_reading_plans.completed_at is not null
          then 0 else user_reading_plans.last_day_done end,
        last_day_done_on = case when user_reading_plans.completed_at is not null
          then null else user_reading_plans.last_day_done_on end,
        started_at = case when user_reading_plans.completed_at is not null
          then now() else user_reading_plans.started_at end,
        completed_at = null;
end;
$$;

create or replace function public.pause_reading_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.user_reading_plans
  set active = false
  where user_id = auth.uid() and plan_id = p_plan_id;
end;
$$;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.list_reading_plans()',
    'public.reading_plan_detail(uuid)',
    'public.active_reading_plan()',
    'public.start_reading_plan(uuid)',
    'public.pause_reading_plan(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public', v_signature);
    execute format('revoke execute on function %s from anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Conquista "Plano concluído" (avaliada em complete_devotional_session, ver a parte 2 desta migration)
-- ---------------------------------------------------------------------------
insert into public.achievements (code, title, description, icon, sort_order)
values ('plan_completed', 'Plano concluído', 'Você terminou um plano de leitura.', '🧭', 15)
on conflict (code) do update
  set title = excluded.title, description = excluded.description,
      icon = excluded.icon, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Parte 2: complete_devotional_session avança o plano e avalia "Plano concluído"
-- (mesma assinatura e retorno da 00017: CREATE OR REPLACE basta)
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
