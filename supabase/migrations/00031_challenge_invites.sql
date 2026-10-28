-- Lumi — convidar alguém para fazer o mesmo desafio.
--
-- Quem está fazendo um desafio pessoal (de exemplo ou criado por ela) gera um código de convite. Quem
-- aceita começa o MESMO desafio, com progresso próprio, e o grupo passa a ver o nome e o andamento uns dos
-- outros (só a contagem do desafio; nada de reflexões, orações ou textos). Um convite por pessoa e por
-- desafio, com até 8 pessoas.
--
-- Tudo passa por funções SECURITY DEFINER; as tabelas não têm acesso direto (RLS ligada, sem permissões).

create table if not exists public.challenge_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (inviter_id, challenge_id)
);

create table if not exists public.challenge_participants (
  invite_id uuid not null references public.challenge_invites (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);

create index if not exists challenge_invites_challenge_idx on public.challenge_invites (challenge_id);
create index if not exists challenge_participants_user_idx on public.challenge_participants (user_id);

alter table public.challenge_invites enable row level security;
alter table public.challenge_participants enable row level security;
revoke all on public.challenge_invites, public.challenge_participants from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Gera (ou devolve) o código de convite do desafio que a pessoa está fazendo
-- ---------------------------------------------------------------------------
create or replace function public.create_challenge_invite(p_challenge_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_invite_id uuid;
  v_hex text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempt integer := 0;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  perform 1 from public.profiles pr where pr.id = v_user_id for update;
  perform public.refresh_user_challenges(v_user_id);

  -- Só convida para um desafio pessoal que a pessoa está fazendo agora.
  if not exists (
    select 1
    from public.user_challenges uc
    join public.challenges c on c.id = uc.challenge_id
    where uc.user_id = v_user_id and uc.challenge_id = p_challenge_id and uc.status = 'active'
      and c.scope = 'personal' and c.archived_at is null
  ) then
    raise exception 'not_found';
  end if;

  select i.code into v_code
  from public.challenge_invites i
  where i.inviter_id = v_user_id and i.challenge_id = p_challenge_id;
  if v_code is not null then return v_code; end if;

  loop
    v_hex := replace(gen_random_uuid()::text, '-', '');
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(
        v_alphabet,
        (get_byte(decode(substr(v_hex, 2 * i + 1, 2), 'hex'), 0) % 32) + 1,
        1
      );
    end loop;
    exit when not exists (select 1 from public.challenge_invites i where i.code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then raise exception 'try_again'; end if;
  end loop;

  insert into public.challenge_invites (code, challenge_id, inviter_id)
  values (v_code, p_challenge_id, v_user_id)
  returning id into v_invite_id;

  insert into public.challenge_participants (invite_id, user_id) values (v_invite_id, v_user_id);
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prévia do convite (antes de aceitar). Código inválido volta nulo e conta como tentativa.
-- ---------------------------------------------------------------------------
create or replace function public.challenge_invite_preview(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_row record;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  if (
    select count(*) from public.circle_join_attempts a
    where a.user_id = v_user_id and a.attempted_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'too_many_attempts';
  end if;

  select i.id as invite_id, i.inviter_id, c.id as challenge_id, c.title, c.description, c.icon,
         c.target, c.window_days
  into v_row
  from public.challenge_invites i
  join public.challenges c on c.id = i.challenge_id
  where i.code = v_code and c.scope = 'personal' and c.archived_at is null;

  if v_row.invite_id is null then
    insert into public.circle_join_attempts (user_id) values (v_user_id);
    return null;
  end if;

  return jsonb_build_object(
    'challenge_id', v_row.challenge_id,
    'title', v_row.title,
    'description', v_row.description,
    'icon', v_row.icon,
    'target', v_row.target,
    'window_days', v_row.window_days,
    'inviter_name', coalesce(nullif(btrim((select pr.display_name from public.profiles pr where pr.id = v_row.inviter_id)), ''), '—'),
    'people', (select count(*) from public.challenge_participants p where p.invite_id = v_row.invite_id),
    'joined', exists (
      select 1 from public.challenge_participants p
      where p.invite_id = v_row.invite_id and p.user_id = v_user_id
    ),
    'already_active', exists (
      select 1 from public.user_challenges uc
      where uc.user_id = v_user_id and uc.challenge_id = v_row.challenge_id and uc.status = 'active'
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Aceita o convite: começa o mesmo desafio e entra no grupo
-- ---------------------------------------------------------------------------
create or replace function public.accept_challenge_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_invite_id uuid;
  v_challenge_id uuid;
  v_window integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  -- Uma pessoa por vez: dois toques seguidos não passam dos limites.
  perform 1 from public.profiles pr where pr.id = v_user_id for update;

  if (
    select count(*) from public.circle_join_attempts a
    where a.user_id = v_user_id and a.attempted_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'too_many_attempts';
  end if;

  select i.id, c.id, c.window_days into v_invite_id, v_challenge_id, v_window
  from public.challenge_invites i
  join public.challenges c on c.id = i.challenge_id
  where i.code = v_code and c.scope = 'personal' and c.archived_at is null;

  if v_invite_id is null then
    insert into public.circle_join_attempts (user_id) values (v_user_id);
    return null;
  end if;

  -- Já está no grupo: nada a fazer (devolve o desafio).
  if exists (
    select 1 from public.challenge_participants p
    where p.invite_id = v_invite_id and p.user_id = v_user_id
  ) then
    return v_challenge_id;
  end if;

  if (select count(*) from public.challenge_participants p where p.invite_id = v_invite_id) >= 8 then
    raise exception 'invite_full';
  end if;

  perform public.refresh_user_challenges(v_user_id);

  if not exists (
    select 1 from public.user_challenges
    where user_id = v_user_id and challenge_id = v_challenge_id and status = 'active'
  ) then
    if (select count(*) from public.user_challenges where user_id = v_user_id and status = 'active') >= 3 then
      raise exception 'too_many_active';
    end if;
    insert into public.user_challenges (user_id, challenge_id, ends_at)
    values (v_user_id, v_challenge_id, now() + make_interval(days => v_window));
  end if;

  insert into public.challenge_participants (invite_id, user_id) values (v_invite_id, v_user_id);
  return v_challenge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Quem está fazendo junto: nome e andamento (só a contagem do desafio)
-- ---------------------------------------------------------------------------
create or replace function public.challenge_group_state(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_metric text;
  v_target integer;
  v_person uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select c.metric, c.target into v_metric, v_target
  from public.challenges c where c.id = p_challenge_id;
  if v_metric is null then return '[]'::jsonb; end if;

  -- Só quem faz parte de um grupo deste desafio enxerga as pessoas dele.
  if not exists (
    select 1
    from public.challenge_participants p
    join public.challenge_invites i on i.id = p.invite_id
    where i.challenge_id = p_challenge_id and p.user_id = v_user_id
  ) then
    return '[]'::jsonb;
  end if;

  for v_person in
    select distinct p.user_id
    from public.challenge_participants p
    join public.challenge_invites i on i.id = p.invite_id
    where i.challenge_id = p_challenge_id
      and i.id in (
        select p2.invite_id from public.challenge_participants p2 where p2.user_id = v_user_id
      )
  loop
    perform public.refresh_user_challenges(v_person);
  end loop;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'name', coalesce(nullif(btrim(pr.display_name), ''), '—'),
        'is_me', g.user_id = v_user_id,
        'status', coalesce(r.status, 'none'),
        'progress', case
          when r.status = 'completed' then v_target
          when r.status in ('active', 'expired') then
            least(public.challenge_metric_value(v_metric, g.user_id, r.started_at, least(r.ends_at, now()) + interval '1 second'), v_target)
          else 0 end,
        'target', v_target
      )
      order by (g.user_id <> v_user_id), g.joined_at
    )
    from (
      select p.user_id, min(p.joined_at) as joined_at
      from public.challenge_participants p
      join public.challenge_invites i on i.id = p.invite_id
      where i.challenge_id = p_challenge_id
        and i.id in (
          select p2.invite_id from public.challenge_participants p2 where p2.user_id = v_user_id
        )
      group by p.user_id
    ) g
    left join public.profiles pr on pr.id = g.user_id
    left join lateral (
      select uc.status, uc.started_at, uc.ends_at
      from public.user_challenges uc
      where uc.user_id = g.user_id and uc.challenge_id = p_challenge_id
      order by uc.started_at desc limit 1
    ) r on true
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- A lista de desafios mostra também o desafio de outra pessoa que a gente aceitou (enquanto ativo)
-- e quantas pessoas fazem junto
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
        'invited', c.owner_id is not null and c.owner_id <> v_user_id,
        'group_size', (
          select count(distinct p.user_id)
          from public.challenge_participants p
          join public.challenge_invites i on i.id = p.invite_id
          where i.challenge_id = c.id
            and i.id in (
              select p2.invite_id from public.challenge_participants p2 where p2.user_id = v_user_id
            )
        ),
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
      and (c.published_at is not null or c.owner_id = v_user_id or a.id is not null)
      and (c.archived_at is null or a.id is not null)
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.create_challenge_invite(uuid) from public, anon;
revoke execute on function public.challenge_invite_preview(text) from public, anon;
revoke execute on function public.accept_challenge_invite(text) from public, anon;
revoke execute on function public.challenge_group_state(uuid) from public, anon;
revoke execute on function public.list_challenges() from public, anon;
grant execute on function public.create_challenge_invite(uuid) to authenticated;
grant execute on function public.challenge_invite_preview(text) to authenticated;
grant execute on function public.accept_challenge_invite(text) to authenticated;
grant execute on function public.challenge_group_state(uuid) to authenticated;
grant execute on function public.list_challenges() to authenticated;
