-- Lumi — avisos dos círculos e preferências de notificação (Bloco B do roadmap).
--
--   1. notification_preferences ganha: recados de retorno (return_enabled), avisos dos círculos
--      (circles_enabled) e o idioma da pessoa (language), usado nos textos das notificações push.
--   2. circle_events: "fulano torceu por você", "fulano orou pelo seu pedido", "gratidão" e "novo
--      pedido". Fechada ao cliente; leitura só por my_circle_events (a pessoa só vê o que é dela).
--   3. device_tokens: tokens FCM dos aparelhos (desativar em vez de apagar). Só funções escrevem.
--   4. As funções de apoio/oração passam a registrar os avisos (só quando algo realmente aconteceu).
--
-- O envio do push em si é feito pela edge function notify-circle-events (ver docs/push-setup.md).
-- Não usa DROP nem DELETE, então o conector do Supabase aplica sozinho.

-- ---------------------------------------------------------------------------
-- 1) Preferências
-- ---------------------------------------------------------------------------
alter table public.notification_preferences
  add column if not exists return_enabled boolean not null default true,
  add column if not exists circles_enabled boolean not null default true,
  add column if not exists language text not null default 'pt';

do $$
begin
  alter table public.notification_preferences
    add constraint notification_preferences_language_check check (language in ('pt', 'en'));
exception when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Avisos dos círculos
-- ---------------------------------------------------------------------------
create table if not exists public.circle_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  request_id uuid references public.prayer_requests (id) on delete cascade,
  kind text not null check (kind in ('cheer', 'prayed', 'gratitude', 'new_request')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  pushed_at timestamptz
);

create index if not exists circle_events_recipient_idx
  on public.circle_events (recipient_id, created_at desc);
create index if not exists circle_events_unpushed_idx
  on public.circle_events (actor_id) where pushed_at is null;

alter table public.circle_events enable row level security;
revoke all on public.circle_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Tokens de push (FCM)
-- ---------------------------------------------------------------------------
create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id) where active;

alter table public.device_tokens enable row level security;
revoke all on public.device_tokens from anon, authenticated;

create or replace function public.register_device_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token is null or char_length(p_token) not between 20 and 4096 then
    raise exception 'invalid_token';
  end if;
  if p_platform not in ('android', 'ios') then raise exception 'invalid_platform'; end if;

  -- O mesmo aparelho pode trocar de conta: o token passa a pertencer a quem entrou por último.
  insert into public.device_tokens (token, user_id, platform, active, updated_at)
  values (p_token, auth.uid(), p_platform, true, now())
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, active = true, updated_at = now();
end;
$$;

-- Ao sair da conta o aparelho para de receber avisos dela.
create or replace function public.deactivate_device_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.device_tokens
  set active = false, updated_at = now()
  where token = p_token and user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Leitura dos avisos pela própria pessoa
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

create or replace function public.mark_circle_events_read()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.circle_events
  set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Apoio e pedidos de oração passam a gerar avisos
-- ---------------------------------------------------------------------------
create or replace function public.cheer_circle_member(p_circle_id uuid, p_to_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_to_user = v_user_id then raise exception 'forbidden'; end if;
  if not public.is_circle_member(p_circle_id, v_user_id)
     or not public.is_circle_member(p_circle_id, p_to_user) then
    raise exception 'not_member';
  end if;

  insert into public.circle_cheers (circle_id, from_user, to_user, day)
  values (p_circle_id, v_user_id, p_to_user, public.user_local_date(v_user_id))
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  -- Só avisa na primeira torcida do dia para a mesma pessoa.
  if v_inserted > 0 then
    insert into public.circle_events (recipient_id, actor_id, circle_id, kind)
    values (p_to_user, v_user_id, p_circle_id, 'cheer');
  end if;
end;
$$;

create or replace function public.create_prayer_request(p_circle_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if not public.is_circle_member(p_circle_id, v_user_id) then raise exception 'not_member'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 280 then
    raise exception 'invalid_body';
  end if;
  if (
    select count(*) from public.prayer_requests r
    where r.author_id = v_user_id and r.created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'rate_limited';
  end if;

  insert into public.prayer_requests (circle_id, author_id, body)
  values (p_circle_id, v_user_id, btrim(p_body))
  returning id into v_id;

  insert into public.circle_events (recipient_id, actor_id, circle_id, request_id, kind)
  select m.user_id, v_user_id, p_circle_id, v_id, 'new_request'
  from public.circle_members m
  where m.circle_id = p_circle_id and m.user_id <> v_user_id;

  return v_id;
end;
$$;

create or replace function public.pray_for_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_circle_id uuid;
  v_author uuid;
  v_inserted integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select r.circle_id, r.author_id into v_circle_id, v_author
  from public.prayer_requests r where r.id = p_request_id;
  if v_circle_id is null then raise exception 'not_found'; end if;
  if not public.is_circle_member(v_circle_id, v_user_id) then raise exception 'not_member'; end if;
  if v_author = v_user_id then raise exception 'forbidden'; end if;

  insert into public.prayer_prayers (request_id, user_id)
  values (p_request_id, v_user_id)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    insert into public.circle_events (recipient_id, actor_id, circle_id, request_id, kind)
    values (v_author, v_user_id, v_circle_id, p_request_id, 'prayed');
  end if;
end;
$$;

-- "Gratidão": o autor marca que o pedido foi atendido; quem orou recebe o aviso (uma vez só).
create or replace function public.resolve_prayer_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_circle_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  update public.prayer_requests r
  set resolved_at = now()
  where r.id = p_request_id and r.author_id = v_user_id and r.resolved_at is null
  returning r.circle_id into v_circle_id;

  if v_circle_id is null then
    -- Já estava marcado: nada a fazer. Se o pedido não é seu (ou não existe), é proibido.
    if exists (
      select 1 from public.prayer_requests r
      where r.id = p_request_id and r.author_id = v_user_id
    ) then
      return;
    end if;
    raise exception 'forbidden';
  end if;

  insert into public.circle_events (recipient_id, actor_id, circle_id, request_id, kind)
  select pp.user_id, v_user_id, v_circle_id, p_request_id, 'gratitude'
  from public.prayer_prayers pp
  where pp.request_id = p_request_id and pp.user_id <> v_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões: só pessoas logadas, só pelas funções
-- ---------------------------------------------------------------------------
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.register_device_token(text, text)',
    'public.deactivate_device_token(text)',
    'public.my_circle_events(integer)',
    'public.mark_circle_events_read()',
    'public.cheer_circle_member(uuid, uuid)',
    'public.create_prayer_request(uuid, text)',
    'public.pray_for_request(uuid)',
    'public.resolve_prayer_request(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public', v_signature);
    execute format('revoke execute on function %s from anon', v_signature);
    execute format('grant execute on function %s to authenticated', v_signature);
  end loop;
end;
$$;
