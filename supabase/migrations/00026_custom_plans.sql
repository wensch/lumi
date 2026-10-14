-- Lumi — planos de leitura criados pela própria pessoa.
--
-- Dois tipos, os dois só visíveis para quem criou:
--   * "Um livro da Bíblia": um capítulo por dia (o app monta os dias e o texto vem da YouVersion
--     pelo passo "Versículo" do devocional, como nos outros planos);
--   * "Plano do YouVersion": a pessoa lê o plano no app da Bíblia e usa o Lumi só para acompanhar os
--     dias e manter a constância (a API pública da YouVersion não traz o conteúdo dos planos).
--
-- Cada dia do plano é uma linha em `content` PRIVADA (owner_id; published_at nulo, então fica fora
-- do devocional do dia de todo mundo) e só o dono a lê. O plano em si reaproveita reading_plans /
-- reading_plan_days e todo o resto (progresso, um dia por dia, conquista de plano concluído).
-- Sem DROP nem DELETE: o conector do Supabase aplica sozinho.

alter table public.content
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

alter table public.reading_plans
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists external_url text,
  add column if not exists archived_at timestamptz;

create index if not exists content_owner_idx on public.content (owner_id) where owner_id is not null;
create index if not exists reading_plans_owner_idx on public.reading_plans (owner_id) where owner_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'content' and policyname = 'content_select_own'
  ) then
    create policy "content_select_own" on public.content
      for select using (owner_id = (select auth.uid()));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Criar (e já começar)
-- ---------------------------------------------------------------------------
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

  -- Confere todos os dias antes de gravar qualquer coisa.
  for v_day in select value as day from jsonb_array_elements(p_days)
  loop
    if jsonb_typeof(v_day.day) <> 'object'
       or jsonb_typeof(v_day.day -> 'title') is distinct from 'string'
       or char_length(trim(v_day.day ->> 'title')) not between 1 and 80
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

-- Tira o plano da lista (e o pausa). Os devocionais já feitos continuam no histórico.
create or replace function public.archive_custom_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  if not exists (select 1 from public.reading_plans p where p.id = p_plan_id and p.owner_id is not null) then
    raise exception 'not_found';
  end if;
  if not exists (select 1 from public.reading_plans p where p.id = p_plan_id and p.owner_id = v_user_id) then
    raise exception 'forbidden';
  end if;

  update public.user_reading_plans set active = false where user_id = v_user_id and plan_id = p_plan_id;
  update public.reading_plans set archived_at = now() where id = p_plan_id and archived_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leitura: planos próprios só para o dono; arquivados somem
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
        'custom', p.owner_id is not null,
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
      order by (p.event_slug is null), (p.owner_id is null), p.sort_order, p.created_at desc, p.title
    )
    from public.reading_plans p
    left join public.user_reading_plans u on u.plan_id = p.id and u.user_id = v_user_id
    where p.published_at is not null
      and p.archived_at is null
      and (p.owner_id is null or p.owner_id = v_user_id)
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
  where p.id = p_plan_id and p.published_at is not null and p.archived_at is null
    and (p.owner_id is null or p.owner_id = v_user_id);
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
    'custom', v_plan.owner_id is not null,
    'external_url', v_plan.external_url,
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
  where p.id = p_plan_id and p.published_at is not null and p.archived_at is null
    and (p.owner_id is null or p.owner_id = v_user_id);

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
    and p.archived_at is null
    and public.event_progress_live(p.event_slug, u.started_at, v_today);

  return v_result;
end;
$$;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.create_custom_plan(text, text, text, text, jsonb, boolean)',
    'public.archive_custom_plan(uuid)',
    'public.list_reading_plans()',
    'public.reading_plan_detail(uuid)',
    'public.start_reading_plan(uuid)',
    'public.active_reading_plan()'
  ]
  loop
    execute format('revoke execute on function %s from public', v_signature);
    execute format('revoke execute on function %s from anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;
