-- Lumi — pente fino de 16/10: desafios e planos próprios, planos de evento e círculos.
--
--   * create_custom_challenge / create_custom_plan: faltava rejeitar escopo/métrica nulos, títulos com
--     caracteres de controle ou invisíveis, e havia teto só por dia; agora também há teto do que
--     fica guardado (20 modelos de desafio por pessoa, 30 por círculo, 1500 dias de plano por pessoa).
--   * start_challenge / start_circle_challenge: não aceitam desafio arquivado e serializam toques
--     simultâneos (limite de 3 ativos; um desafio por círculo).
--   * reading_plan_detail: plano de evento de uma edição passada aparecia como concluído no detalhe,
--     enquanto a lista e o plano ativo já o tratavam como novo.
--   * remove_circle_member / leave_circle: antes de a pessoa sair (ou ser removida), o desafio do círculo
--     que já bateu a meta é registrado como concluído (senão virava "expirado" por perder a contribuição).
-- Sem DELETE nem DROP no texto: o conector do Supabase aplica sozinho (leave_circle vira "core" e uma
-- função pública fina a chama, como em remove_circle_member na 00023).

create or replace function public.create_custom_challenge(
  p_scope text,
  p_circle_id uuid,
  p_title text,
  p_description text,
  p_icon text,
  p_metric text,
  p_target integer,
  p_window_days integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_icon text := nullif(trim(coalesce(p_icon, '')), '');
  v_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_scope is null or p_scope not in ('personal', 'circle') then raise exception 'invalid_input'; end if;
  -- Título e descrição sem caracteres de controle nem invisíveis (um título "em branco" não vale).
  if (v_title || v_description) ~ '[[:cntrl:]\u200B-\u200F\u2028-\u202E\u2060\uFEFF]' then raise exception 'invalid_input'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 40 then raise exception 'invalid_input'; end if;
  if char_length(v_description) > 140 then raise exception 'invalid_input'; end if;
  if v_icon is not null and char_length(v_icon) > 8 then raise exception 'invalid_input'; end if;
  if p_metric is null or p_metric not in ('moments_days', 'reflections', 'cheers', 'prayers') then raise exception 'invalid_input'; end if;
  if p_window_days is null or p_window_days < 1 or p_window_days > 60 then raise exception 'invalid_input'; end if;
  if p_target is null or p_target < 1 or p_target > 100 then raise exception 'invalid_input'; end if;
  -- "dias com momento" não passa do número de dias do prazo.
  if p_metric = 'moments_days' and p_target > p_window_days then raise exception 'invalid_input'; end if;

  if p_scope = 'circle' then
    if p_circle_id is null or not public.is_circle_member(p_circle_id, v_user_id) then
      raise exception 'not_member';
    end if;
  end if;

  -- Contra abuso: poucos modelos novos por dia.
  if (
    select count(*) from public.challenges c
    where c.created_by = v_user_id and c.created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'too_many_created';
  end if;
  -- Teto do que fica guardado (a lista de modelos não cresce sem fim).
  if (
    select count(*) from public.challenges c
    where c.created_by = v_user_id and c.archived_at is null
  ) >= 20
  or (
    p_scope = 'circle' and (
      select count(*) from public.challenges c
      where c.circle_id = p_circle_id and c.archived_at is null
    ) >= 30
  ) then
    raise exception 'too_many_created';
  end if;

  insert into public.challenges (
    slug, title, description, icon, scope, metric, target, window_days, sort_order,
    published_at, owner_id, circle_id, created_by
  )
  values (
    'custom-' || gen_random_uuid()::text,
    v_title,
    v_description,
    v_icon,
    p_scope,
    p_metric,
    p_target,
    p_window_days,
    0,
    null,
    case when p_scope = 'personal' then v_user_id end,
    case when p_scope = 'circle' then p_circle_id end,
    v_user_id
  )
  returning id into v_id;

  -- Já começa: se não der (limite de desafios ativos, círculo já com um desafio), desfaz tudo.
  if p_scope = 'personal' then
    perform public.start_challenge(v_id);
  else
    perform public.start_circle_challenge(p_circle_id, v_id);
  end if;

  return v_id;
end;
$$;

create or replace function public.create_custom_plan(
  p_title text,
  p_description text,
  p_icon text,
  p_external_url text,
  p_days jsonb,
  p_start boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_icon text := nullif(trim(coalesce(p_icon, '')), '');
  v_url text := nullif(trim(coalesce(p_external_url, '')), '');
  v_plan_id uuid;
  v_content_id uuid;
  v_day record;
  v_count integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 60 then raise exception 'invalid_input'; end if;
  if (v_title || v_description) ~ '[[:cntrl:]\u200B-\u200F\u2028-\u202E\u2060\uFEFF]' then raise exception 'invalid_input'; end if;
  if char_length(v_description) > 200 then raise exception 'invalid_input'; end if;
  if v_icon is not null and char_length(v_icon) > 8 then raise exception 'invalid_input'; end if;
  -- Só links da própria YouVersion (o plano abre no app da Bíblia).
  if v_url is not null and (
    char_length(v_url) > 300
    or v_url !~* '^https://([a-z0-9-]+\.)*(bible\.com|youversion\.com)(/[^[:space:]]*)?$'
  ) then
    raise exception 'invalid_input';
  end if;
  if p_days is null or jsonb_typeof(p_days) <> 'array' then raise exception 'invalid_input'; end if;
  v_count := jsonb_array_length(p_days);
  if v_count < 3 or v_count > 366 then raise exception 'invalid_input'; end if;

  if (
    select count(*) from public.reading_plans p
    where p.owner_id = v_user_id and p.archived_at is null
  ) >= 10 then
    raise exception 'too_many_plans';
  end if;
  if (
    select count(*) from public.reading_plans p
    where p.owner_id = v_user_id and p.created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'too_many_created';
  end if;
  -- Dias de plano ficam guardados mesmo depois de arquivar: teto no total de dias por pessoa.
  if (select count(*) from public.content c where c.owner_id = v_user_id) + v_count > 1500 then
    raise exception 'too_many_created';
  end if;

  -- Confere todos os dias antes de gravar qualquer coisa.
  for v_day in select value as day from jsonb_array_elements(p_days)
  loop
    if jsonb_typeof(v_day.day) <> 'object'
       or jsonb_typeof(v_day.day -> 'title') is distinct from 'string'
       or char_length(trim(v_day.day ->> 'title')) not between 1 and 80
       or (v_day.day ->> 'title') ~ '[[:cntrl:]\u200B-\u200F\u2028-\u202E\u2060\uFEFF]'
       or char_length(coalesce(v_day.day ->> 'body', '')) > 600
       or (
         nullif(v_day.day ->> 'passage_reference', '') is not null
         and (v_day.day ->> 'passage_reference') !~ '^[1-3]?[A-Z]{2,3}\.[0-9]{1,3}(\.[0-9]{1,3}(-[0-9]{1,3})?)?$'
       ) then
      raise exception 'invalid_input';
    end if;
  end loop;

  insert into public.reading_plans (slug, title, description, icon, sort_order, published_at, owner_id, external_url)
  values ('custom-' || gen_random_uuid()::text, v_title, v_description, v_icon, 0, now(), v_user_id, v_url)
  returning id into v_plan_id;

  for v_day in
    select value as day, ordinality as n from jsonb_array_elements(p_days) with ordinality
  loop
    insert into public.content (title, body, passage_reference, owner_id)
    values (
      trim(v_day.day ->> 'title'),
      coalesce(v_day.day ->> 'body', ''),
      nullif(v_day.day ->> 'passage_reference', ''),
      v_user_id
    )
    returning id into v_content_id;

    insert into public.reading_plan_days (plan_id, day_number, content_id)
    values (v_plan_id, v_day.n, v_content_id);
  end loop;

  if p_start then
    perform public.start_reading_plan(v_plan_id);
  end if;

  return v_plan_id;
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
  -- Uma pessoa por vez: dois toques seguidos não passam do limite de desafios ativos.
  perform 1 from public.profiles pr where pr.id = v_user_id for update;

  select c.window_days into v_window
  from public.challenges c
  where c.id = p_challenge_id and c.scope = 'personal' and c.archived_at is null
    and (c.published_at is not null or c.owner_id = v_user_id);
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
  -- Um desafio por círculo: serializa quem tenta começar ao mesmo tempo.
  perform 1 from public.circles ci where ci.id = p_circle_id for update;

  select c.window_days, c.target into v_window, v_per_member
  from public.challenges c
  where c.id = p_challenge_id and c.scope = 'circle' and c.archived_at is null
    and (c.published_at is not null or c.circle_id = p_circle_id);
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
  v_live boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_plan from public.reading_plans p
  where p.id = p_plan_id and p.published_at is not null and p.archived_at is null
    and (p.owner_id is null or p.owner_id = v_user_id);
  if v_plan.id is null then raise exception 'not_found'; end if;

  select * into v_progress from public.user_reading_plans u
  where u.user_id = v_user_id and u.plan_id = p_plan_id;

  v_today := public.user_local_date(v_user_id);
  -- Plano de evento de uma edição passada não conta: igual à lista e ao plano ativo.
  v_live := v_progress.user_id is not null
    and public.event_progress_live(v_plan.event_slug, v_progress.started_at, v_today);
  select count(*) into v_total from public.reading_plan_days d where d.plan_id = p_plan_id;

  return jsonb_build_object(
    'id', v_plan.id,
    'title', v_plan.title,
    'description', v_plan.description,
    'icon', v_plan.icon,
    'custom', v_plan.owner_id is not null,
    'external_url', v_plan.external_url,
    'days', v_total,
    'status', case
      when not v_live then 'none'
      when v_progress.completed_at is not null then 'done'
      when v_progress.active then 'active'
      else 'paused'
    end,
    'last_day_done', case when v_live then v_progress.last_day_done else 0 end,
    'done_today', v_live and coalesce(v_progress.last_day_done_on = v_today, false),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', d.day_number,
          'title', c.title,
          'passage_reference', c.passage_reference,
          'state', case
            when v_live and d.day_number <= v_progress.last_day_done then 'done'
            when d.day_number = case when v_live then v_progress.last_day_done else 0 end + 1 then 'next'
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


-- Sair do círculo: registra antes um desafio que já tinha batido a meta.
alter function public.leave_circle(uuid) rename to leave_circle_core;
revoke execute on function public.leave_circle_core(uuid) from public, anon, authenticated;

create or replace function public.leave_circle(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if public.is_circle_member(p_circle_id, auth.uid()) then
    perform public.refresh_circle_challenge(p_circle_id);
  end if;
  perform public.leave_circle_core(p_circle_id);
end;
$$;

create or replace function public.remove_circle_member(p_circle_id uuid, p_user_id uuid)
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
    select 1 from public.circles c where c.id = p_circle_id and c.owner_id = v_user_id
  ) then
    raise exception 'forbidden';
  end if;
  if p_user_id = v_user_id then raise exception 'forbidden'; end if;

  perform public.refresh_circle_challenge(p_circle_id);

  insert into public.circle_bans (circle_id, user_id)
  values (p_circle_id, p_user_id)
  on conflict do nothing;

  perform public.remove_circle_member_core(p_circle_id, p_user_id);
end;
$$;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.create_custom_challenge(text, uuid, text, text, text, text, integer, integer)',
    'public.create_custom_plan(text, text, text, text, jsonb, boolean)',
    'public.start_challenge(uuid)',
    'public.start_circle_challenge(uuid, uuid)',
    'public.reading_plan_detail(uuid)',
    'public.leave_circle(uuid)',
    'public.remove_circle_member(uuid, uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public', v_signature);
    execute format('revoke execute on function %s from anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;
