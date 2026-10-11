-- Lumi — eventos do calendário cristão (Fase 4, item 9): Advento, Natal e Páscoa.
--
-- Um evento é um plano de leitura ESPECIAL (a mesma estrutura dos planos da 00019: um dia do plano por
-- dia do calendário, progresso, conquistas) que só aparece na época certa:
--
--   seasonal_events        as datas de cada evento em cada ano (começo, fim e quantos dias antes já
--                          aparece o convite). Tabela fechada ao cliente; o conteúdo de datas é
--                          preenchido pelo seed-events.sql (2026 a 2035) e dá para ajustar à mão.
--   reading_plans.event_slug  liga o plano ao evento ('advento', 'natal', 'pascoa').
--   content.seasonal       devocionais de evento: ficam FORA do sorteio do devocional do dia (um
--                          devocional de Natal não aparece em julho) e só chegam pelo plano.
--
-- Funções:
--   active_events()        eventos em andamento ou chegando (convite 'soon' antes de começar) com o
--                          progresso da pessoa; alimenta o cartão da tela Hoje.
--   list_reading_plans()   planos de evento só aparecem na época (ou se a pessoa já tem progresso).
--   start_reading_plan()   plano de evento só começa na época; recomeça do dia 1 se o progresso é de
--                          um ano anterior.
--   active_reading_plan()  ignora progresso de evento de anos anteriores (não aparece Advento em julho).
--   complete_devotional_session  três conquistas novas: terminar o plano de cada evento.
--
-- Sem DROP nem DELETE.

alter table public.content
  add column if not exists seasonal boolean not null default false;
comment on column public.content.seasonal is 'Devocional de evento (Advento, Natal, Páscoa): fora do sorteio do dia, só pelo plano do evento.';

alter table public.reading_plans
  add column if not exists event_slug text;
create unique index if not exists reading_plans_event_slug_key
  on public.reading_plans (event_slug) where event_slug is not null;

create table if not exists public.seasonal_events (
  slug text not null,
  year integer not null,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  -- Quantos dias antes de começar o convite já aparece.
  lead_days integer not null default 7 check (lead_days >= 0),
  primary key (slug, year)
);

alter table public.seasonal_events enable row level security;
revoke all on public.seasonal_events from anon, authenticated;

-- O progresso de um plano de evento só vale se foi iniciado nesta edição do evento (ou na anterior,
-- ainda dentro de 30 dias depois do fim); progresso de ano passado fica "apagado" para a pessoa.
create or replace function public.event_progress_live(p_slug text, p_started_at timestamptz, p_today date)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_slug is null or exists (
    select 1 from public.seasonal_events e
    where e.slug = p_slug
      and p_started_at::date >= e.starts_on - e.lead_days
      and p_started_at::date <= e.ends_on
      and p_today <= e.ends_on + 30
  );
$$;
revoke execute on function public.event_progress_live(text, timestamptz, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Eventos em andamento (ou chegando)
-- ---------------------------------------------------------------------------
create or replace function public.active_events()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  v_today := public.user_local_date(v_user_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'slug', e.slug,
        'plan_id', p.id,
        'title', p.title,
        'description', p.description,
        'icon', p.icon,
        'days', (select count(*) from public.reading_plan_days d where d.plan_id = p.id),
        'state', case when v_today >= e.starts_on then 'now' else 'soon' end,
        'starts_on', e.starts_on,
        'ends_on', e.ends_on,
        'status', case
          when u.user_id is null or not public.event_progress_live(e.slug, u.started_at, v_today) then 'none'
          when u.completed_at is not null then 'done'
          when u.active then 'active'
          else 'paused'
        end,
        'last_day_done', case
          when u.user_id is null or not public.event_progress_live(e.slug, u.started_at, v_today) then 0
          else u.last_day_done
        end
      )
      order by (v_today >= e.starts_on) desc, e.starts_on
    )
    from public.seasonal_events e
    join public.reading_plans p on p.event_slug = e.slug and p.published_at is not null
    left join public.user_reading_plans u on u.plan_id = p.id and u.user_id = v_user_id
    where v_today between e.starts_on - e.lead_days and e.ends_on
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Planos: lista, começar e plano ativo passam a respeitar a época dos eventos
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
  v_today date;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  v_today := public.user_local_date(v_user_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'title', p.title,
        'description', p.description,
        'icon', p.icon,
        'event_slug', p.event_slug,
        'days', (select count(*) from public.reading_plan_days d where d.plan_id = p.id),
        'status', case
          when u.user_id is null or not public.event_progress_live(p.event_slug, u.started_at, v_today) then 'none'
          when u.completed_at is not null then 'done'
          when u.active then 'active'
          else 'paused'
        end,
        'last_day_done', case
          when u.user_id is null or not public.event_progress_live(p.event_slug, u.started_at, v_today) then 0
          else u.last_day_done
        end
      )
      order by (p.event_slug is null), p.sort_order, p.title
    )
    from public.reading_plans p
    left join public.user_reading_plans u on u.plan_id = p.id and u.user_id = v_user_id
    where p.published_at is not null
      and (
        p.event_slug is null
        or exists (
          select 1 from public.seasonal_events e
          where e.slug = p.event_slug and v_today between e.starts_on - e.lead_days and e.ends_on
        )
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.start_reading_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_event text;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  v_today := public.user_local_date(v_user_id);

  select p.event_slug into v_event
  from public.reading_plans p
  where p.id = p_plan_id and p.published_at is not null;

  if not found or not exists (select 1 from public.reading_plan_days d where d.plan_id = p_plan_id) then
    raise exception 'not_found';
  end if;

  -- Plano de evento só começa na época do evento.
  if v_event is not null and not exists (
    select 1 from public.seasonal_events e
    where e.slug = v_event and v_today between e.starts_on - e.lead_days and e.ends_on
  ) then
    raise exception 'not_available';
  end if;

  -- Um plano ativo por vez: os outros ficam em pausa, com o progresso guardado.
  update public.user_reading_plans set active = false
  where user_id = v_user_id and active and plan_id <> p_plan_id;

  insert into public.user_reading_plans (user_id, plan_id)
  values (v_user_id, p_plan_id)
  on conflict (user_id, plan_id) do update
    set active = true,
        -- Plano já concluído (ou progresso de um ano anterior, no caso dos eventos): recomeça do dia 1.
        last_day_done = case
          when user_reading_plans.completed_at is not null
            or not public.event_progress_live(v_event, user_reading_plans.started_at, v_today)
          then 0 else user_reading_plans.last_day_done end,
        last_day_done_on = case
          when user_reading_plans.completed_at is not null
            or not public.event_progress_live(v_event, user_reading_plans.started_at, v_today)
          then null else user_reading_plans.last_day_done_on end,
        started_at = case
          when user_reading_plans.completed_at is not null
            or not public.event_progress_live(v_event, user_reading_plans.started_at, v_today)
          then now() else user_reading_plans.started_at end,
        completed_at = null;
end;
$$;

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
  where u.user_id = v_user_id and u.active and u.completed_at is null
    and public.event_progress_live(p.event_slug, u.started_at, v_today);

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Conquistas de evento (avaliadas em complete_devotional_session)
-- ---------------------------------------------------------------------------
insert into public.achievements (code, title, description, icon, sort_order)
values
  ('event_advento', 'Advento até o fim', 'Você caminhou os 24 dias do Advento com o Lumi.', '🕯️', 18),
  ('event_natal', 'Natal com o Lumi', 'Você completou os sete dias de Natal.', '🎄', 19),
  ('event_pascoa', 'Páscoa com o Lumi', 'Você acompanhou a semana da Páscoa até o domingo da ressurreição.', '🌅', 20)
on conflict (code) do update
  set title = excluded.title, description = excluded.description,
      icon = excluded.icon, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- complete_devotional_session (mesma assinatura e retorno: CREATE OR REPLACE basta)
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
  v_inserted integer;
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
  begin
    perform public.refresh_user_challenges(v_user_id);
  exception when others then
    raise warning 'refresh_user_challenges falhou: %', sqlerrm;
  end;

  -- Conquistas são avaliadas a cada conclusão (não só na primeira do dia): terminar um plano ou
  -- entrar num círculo pode acontecer em qualquer momento. XP só entra uma vez por conquista.
  select count(distinct (s.completed_at at time zone public.safe_timezone(v_user_timezone))::date)
    into v_completed_sessions_count
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
        where m.user_id = v_user_id and cc.status = 'completed' and m.joined_at <= cc.started_at
      )
      when 'event_advento' then exists (
        select 1 from public.user_reading_plans up
        join public.reading_plans rp on rp.id = up.plan_id
        where up.user_id = v_user_id and up.completed_at is not null and rp.event_slug = 'advento'
      )
      when 'event_natal' then exists (
        select 1 from public.user_reading_plans up
        join public.reading_plans rp on rp.id = up.plan_id
        where up.user_id = v_user_id and up.completed_at is not null and rp.event_slug = 'natal'
      )
      when 'event_pascoa' then exists (
        select 1 from public.user_reading_plans up
        join public.reading_plans rp on rp.id = up.plan_id
        where up.user_id = v_user_id and up.completed_at is not null and rp.event_slug = 'pascoa'
      )
      else false
    end;

    if v_earned then
      insert into public.user_achievements (user_id, achievement_id)
      values (v_user_id, v_achievement.id)
      on conflict do nothing;
      get diagnostics v_inserted = row_count;

      if v_inserted > 0 then
        insert into public.xp_events (user_id, amount, reason, devotional_session_id)
        values (v_user_id, 20, 'achievement', p_session_id);

        v_unlocked := array_append(v_unlocked, v_achievement.code);
      end if;
    end if;
  end loop;

  return query select v_new_streak, v_longest, v_xp_awarded, v_unlocked,
                      v_freeze_used, v_freeze_earned, v_freezes;
end;
$$;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.active_events()',
    'public.list_reading_plans()',
    'public.start_reading_plan(uuid)',
    'public.active_reading_plan()',
    'public.complete_devotional_session(uuid, text)'
  ]
  loop
    execute format('revoke execute on function %s from public', v_signature);
    execute format('revoke execute on function %s from anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;
