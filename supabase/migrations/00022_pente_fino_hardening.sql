-- Lumi — pente fino (11/10/2026): correções de segurança e consistência do banco.
--
-- Tudo é REVOKE, CREATE OR REPLACE ou UPDATE de correção (nada é recriado ou apagado).
--
--   1. Perfil: o cliente podia APAGAR a própria linha de profiles e recriá-la com um fuso inválido
--      ('bogus'); isso derrubava my_circles/circle_detail de TODOS os membros dos círculos dele. Agora
--      o cliente não insere nem apaga profiles (o cadastro cria a linha por trigger), o fuso passa por
--      safe_timezone() e fusos inválidos antigos são corrigidos.
--   2. Privilégios: tira TRUNCATE/REFERENCES/TRIGGER de anon/authenticated e a escrita de apagar em
--      devotional_sessions (as reflexões são apagadas por clear_session_reflection).
--   3. Desafios: o prazo vale de verdade (atividade depois do prazo não conclui nem libera conquista),
--      desafio de círculo só conta o que cada pessoa fez DEPOIS de entrar e torcidas/orações DAQUELE
--      círculo, e só quem começou o desafio (ou o criador do círculo) pode parar.
--   4. complete_devotional_session: uma falha nos desafios nunca impede o momento do dia; "momentos"
--      (conquistas de 10/50/100) contam dias distintos, não sessões; conquista do círculo exige já ser
--      membro quando o desafio começou; XP de conquista só entra se ela foi gravada agora.
--   5. Limite de sessões abertas por dia (o cliente pode inserir sessões; evita inflar contagens).
--   6. my_circle_events só mostra avisos de círculos de que a pessoa ainda participa.
--   7. Um plano de leitura ativo por pessoa, garantido por índice único.

-- ---------------------------------------------------------------------------
-- 1) Perfil e fuso
-- ---------------------------------------------------------------------------
revoke insert, delete on public.profiles from anon, authenticated;

create or replace function public.safe_timezone(p_tz text)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if p_tz is null then return 'America/Sao_Paulo'; end if;
  perform now() at time zone p_tz; -- levanta erro se o fuso não existe
  return p_tz;
exception when others then
  return 'America/Sao_Paulo';
end;
$$;
revoke execute on function public.safe_timezone(text) from public, anon, authenticated;

create or replace function public.user_local_date(p_user_id uuid)
returns date
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (now() at time zone public.safe_timezone(
    (select p.timezone from public.profiles p where p.id = p_user_id)
  ))::date;
$$;

update public.profiles
set timezone = public.safe_timezone(timezone)
where timezone is distinct from public.safe_timezone(timezone);

-- ---------------------------------------------------------------------------
-- 2) Privilégios
-- ---------------------------------------------------------------------------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke delete on public.devotional_sessions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Desafios
-- ---------------------------------------------------------------------------
-- A janela de contagem termina no prazo (least): atividade depois do prazo não conta.
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
      v_row.metric, p_user, v_row.started_at, least(v_row.ends_at, now()) + interval '1 second'
    );
    if v_value >= v_row.target then
      update public.user_challenges set status = 'completed', completed_at = now() where id = v_row.id;
    elsif now() > v_row.ends_at then
      update public.user_challenges set status = 'expired' where id = v_row.id;
    end if;
  end loop;
end;
$$;

-- Soma da meta do círculo: cada pessoa conta só a partir de quando entrou no círculo, e torcidas e
-- orações são as feitas NESTE círculo (a mesma ação não vale em dois círculos).
create or replace function public.circle_challenge_value(p_circle_id uuid, p_challenge_id uuid, p_from timestamptz, p_to timestamptz)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(
    case c.metric
      when 'cheers' then (
        select count(*) from public.circle_cheers ch
        where ch.circle_id = p_circle_id and ch.from_user = m.user_id
          and ch.day >= (greatest(p_from, m.joined_at) at time zone public.safe_timezone(pr.timezone))::date
          and ch.day <= (p_to at time zone public.safe_timezone(pr.timezone))::date
      )
      when 'prayers' then (
        select count(*) from public.prayer_prayers pp
        join public.prayer_requests r on r.id = pp.request_id
        where r.circle_id = p_circle_id and pp.user_id = m.user_id
          and pp.created_at >= greatest(p_from, m.joined_at) and pp.created_at < p_to
      )
      else public.challenge_metric_value(c.metric, m.user_id, greatest(p_from, m.joined_at), p_to)
    end
  ), 0)::integer
  from public.challenges c
  join public.circle_members m on m.circle_id = p_circle_id
  left join public.profiles pr on pr.id = m.user_id
  where c.id = p_challenge_id;
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
      p_circle_id, v_row.challenge_id, v_row.started_at, least(v_row.ends_at, now()) + interval '1 second'
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
          least(public.challenge_metric_value(c.metric, v_user_id, a.started_at, least(a.ends_at, now()) + interval '1 second'), c.target)
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

-- Só quem começou o desafio ou o criador do círculo pode parar o desafio de todos.
create or replace function public.stop_circle_challenge(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.is_circle_member(p_circle_id, auth.uid()) then raise exception 'not_member'; end if;

  update public.circle_challenges cc
  set status = 'abandoned'
  where cc.circle_id = p_circle_id and cc.status = 'active'
    and (
      cc.started_by = auth.uid()
      or exists (select 1 from public.circles c where c.id = p_circle_id and c.owner_id = auth.uid())
    );

  if not found and exists (
    select 1 from public.circle_challenges cc where cc.circle_id = p_circle_id and cc.status = 'active'
  ) then
    raise exception 'forbidden';
  end if;
end;
$$;

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
      public.circle_challenge_value(p_circle_id, c.id, cc.started_at, least(cc.ends_at, now()) + interval '1 second'),
      cc.target
    ),
    'ends_at', cc.ends_at,
    'can_stop', (
      cc.started_by = v_user_id
      or exists (select 1 from public.circles ci where ci.id = p_circle_id and ci.owner_id = v_user_id)
    )
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

-- ---------------------------------------------------------------------------
-- 4) complete_devotional_session (mesma assinatura e retorno: CREATE OR REPLACE basta)
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

-- ---------------------------------------------------------------------------
-- 5) Limite de sessões abertas por dia (o cliente pode inserir sessões; o app usa 1 a 2 por dia)
-- ---------------------------------------------------------------------------
create or replace function public.limit_sessions_per_day()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    select count(*) from public.devotional_sessions s
    where s.user_id = new.user_id and s.started_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'too_many_sessions';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_sessions_per_day() from public, anon, authenticated;

do $$
begin
  create trigger devotional_sessions_limit
    before insert on public.devotional_sessions
    for each row execute function public.limit_sessions_per_day();
exception when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Avisos só de círculos em que a pessoa ainda está
-- ---------------------------------------------------------------------------
create or replace function public.my_circle_events(p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  return jsonb_build_object(
    'unread', (
      select count(*) from public.circle_events e
      where e.recipient_id = v_user_id and e.read_at is null
        and e.created_at > now() - interval '30 days'
        and public.is_circle_member(e.circle_id, v_user_id)
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'kind', x.kind,
          'actor_name', coalesce(nullif(btrim(p.display_name), ''), '—'),
          'circle_id', x.circle_id,
          'circle_name', c.name,
          'snippet', case when r.body is null then null else left(r.body, 60) end,
          'read', x.read_at is not null,
          'created_at', x.created_at
        )
        order by x.created_at desc
      )
      from (
        select * from public.circle_events e
        where e.recipient_id = v_user_id and e.created_at > now() - interval '30 days'
          and public.is_circle_member(e.circle_id, v_user_id)
        order by e.created_at desc
        limit v_limit
      ) x
      left join public.profiles p on p.id = x.actor_id
      join public.circles c on c.id = x.circle_id
      left join public.prayer_requests r on r.id = x.request_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Um plano de leitura ativo por pessoa (garantido pelo banco, mesmo com dois toques simultâneos)
-- ---------------------------------------------------------------------------
update public.user_reading_plans u
set active = false
where u.active
  and exists (
    select 1 from public.user_reading_plans x
    where x.user_id = u.user_id and x.active
      and (x.started_at, x.plan_id) > (u.started_at, u.plan_id)
  );

create unique index if not exists user_reading_plans_one_active
  on public.user_reading_plans (user_id) where active;
