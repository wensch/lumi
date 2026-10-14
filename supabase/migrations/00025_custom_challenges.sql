-- Lumi — desafios criados pela própria pessoa.
--
-- Cada pessoa pode criar um desafio PESSOAL (só ela vê) e cada membro pode criar um desafio do
-- CÍRCULO (só aquele círculo vê). O desafio usa as mesmas métricas automáticas dos exemplos
-- (dias com momento, reflexões, torcidas, orações): a pessoa só escolhe o nome, a métrica, a meta e
-- o prazo. Nada de texto livre além do nome e de uma descrição curta.
--
-- Os desafios do catálogo continuam sendo os "exemplos". Um desafio próprio fica guardado como
-- modelo (para repetir depois) e pode ser arquivado por quem o criou (ou pelo dono do círculo).
-- Sem DROP nem DELETE: o conector do Supabase aplica sozinho.

alter table public.challenges
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists circle_id uuid references public.circles (id) on delete cascade,
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists archived_at timestamptz;

-- Um desafio próprio é pessoal OU de um círculo, nunca os dois.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'challenges_custom_scope_chk') then
    alter table public.challenges add constraint challenges_custom_scope_chk
      check (
        (owner_id is null and circle_id is null)
        or (scope = 'personal' and owner_id is not null and circle_id is null)
        or (scope = 'circle' and circle_id is not null and owner_id is null)
      );
  end if;
end $$;

create index if not exists challenges_owner_idx on public.challenges (owner_id) where owner_id is not null;
create index if not exists challenges_circle_idx on public.challenges (circle_id) where circle_id is not null;
create index if not exists challenges_created_by_idx on public.challenges (created_by) where created_by is not null;

-- ---------------------------------------------------------------------------
-- Criar (e já começar)
-- ---------------------------------------------------------------------------
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
  if p_scope not in ('personal', 'circle') then raise exception 'invalid_input'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 40 then raise exception 'invalid_input'; end if;
  if char_length(v_description) > 140 then raise exception 'invalid_input'; end if;
  if v_icon is not null and char_length(v_icon) > 8 then raise exception 'invalid_input'; end if;
  if p_metric not in ('moments_days', 'reflections', 'cheers', 'prayers') then raise exception 'invalid_input'; end if;
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

-- Tira um desafio próprio da lista (não apaga o histórico de quem o fez).
create or replace function public.archive_custom_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_row record;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select c.owner_id, c.circle_id, c.created_by into v_row
  from public.challenges c
  where c.id = p_challenge_id and (c.owner_id is not null or c.circle_id is not null);
  if not found then raise exception 'not_found'; end if;

  if v_row.owner_id is not null then
    if v_row.owner_id <> v_user_id then raise exception 'forbidden'; end if;
  else
    if not public.is_circle_member(v_row.circle_id, v_user_id) then raise exception 'not_member'; end if;
    if v_row.created_by is distinct from v_user_id
       and not exists (select 1 from public.circles ci where ci.id = v_row.circle_id and ci.owner_id = v_user_id) then
      raise exception 'forbidden';
    end if;
  end if;

  update public.challenges set archived_at = now() where id = p_challenge_id and archived_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Começar: aceita também os desafios próprios da pessoa / do círculo
-- ---------------------------------------------------------------------------
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
  where c.id = p_challenge_id and c.scope = 'personal'
    and (c.published_at is not null or (c.owner_id = v_user_id and c.archived_at is null));
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

  select c.window_days, c.target into v_window, v_per_member
  from public.challenges c
  where c.id = p_challenge_id and c.scope = 'circle'
    and (c.published_at is not null or (c.circle_id = p_circle_id and c.archived_at is null));
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

-- ---------------------------------------------------------------------------
-- Listas: exemplos do catálogo + os desafios próprios
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
        'custom', c.owner_id is not null,
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
      order by (a.id is null), (c.owner_id is null), c.sort_order, c.created_at desc, c.title
    )
    from public.challenges c
    left join public.user_challenges a
      on a.challenge_id = c.id and a.user_id = v_user_id and a.status = 'active'
    where c.scope = 'personal'
      and (c.published_at is not null or c.owner_id = v_user_id)
      and (c.archived_at is null or a.id is not null)
  ), '[]'::jsonb);
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
  v_is_owner boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if not public.is_circle_member(p_circle_id, v_user_id) then raise exception 'not_member'; end if;

  perform public.refresh_circle_challenge(p_circle_id);

  v_is_owner := exists (select 1 from public.circles ci where ci.id = p_circle_id and ci.owner_id = v_user_id);

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
    'can_stop', (cc.started_by = v_user_id or v_is_owner)
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
    'members', (select count(*) from public.circle_members m where m.circle_id = p_circle_id),
    'available', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'title', c.title,
          'description', c.description,
          'icon', c.icon,
          'window_days', c.window_days,
          'target', c.target * (select count(*) from public.circle_members m where m.circle_id = p_circle_id),
          'custom', c.circle_id is not null,
          'can_archive', (c.circle_id is not null and (c.created_by = v_user_id or v_is_owner))
        )
        order by (c.circle_id is null), c.sort_order, c.created_at desc, c.title
      )
      from public.challenges c
      where c.scope = 'circle'
        and c.archived_at is null
        and (c.published_at is not null or c.circle_id = p_circle_id)
    ), '[]'::jsonb)
  );
end;
$$;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.create_custom_challenge(text, uuid, text, text, text, text, integer, integer)',
    'public.archive_custom_challenge(uuid)',
    'public.list_challenges()',
    'public.start_challenge(uuid)',
    'public.circle_challenge_state(uuid)',
    'public.start_circle_challenge(uuid, uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public', v_signature);
    execute format('revoke execute on function %s from anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;
