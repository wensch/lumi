-- Lumi — 00015 (Círculos), SÓ AS FUNÇÕES.
--
-- As 7 tabelas dos círculos já foram criadas no banco (migration `circles_tables`, aplicada pelo
-- conector). Este arquivo é o restante do 00015_circles.sql: rode-o no SQL Editor quando as
-- funções não puderem ser aplicadas pelo conector. NÃO rode o 00015_circles.sql inteiro depois
-- disso (as tabelas já existem). Em um banco novo, rode apenas o 00015_circles.sql completo.
--

-- ---------------------------------------------------------------------------
-- Auxiliares (internas)
-- ---------------------------------------------------------------------------
create or replace function public.is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.circle_members m
    where m.circle_id = p_circle_id and m.user_id = p_user_id
  );
$$;

create or replace function public.user_local_date(p_user_id uuid)
returns date
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = p_user_id),
    'America/Sao_Paulo'
  ))::date;
$$;

revoke execute on function public.is_circle_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.user_local_date(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Círculos: criar, entrar, sair, remover
-- ---------------------------------------------------------------------------
create or replace function public.create_circle(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_hex text;
  v_circle_id uuid;
  v_attempt integer := 0;
  i integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 40 then
    raise exception 'invalid_name';
  end if;
  if (select count(*) from public.circle_members m where m.user_id = v_user_id) >= 5 then
    raise exception 'too_many_circles';
  end if;

  -- Código de 8 caracteres sem letras ambíguas (0/O, 1/I), tirado de bytes aleatórios fortes.
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
    exit when not exists (select 1 from public.circles c where c.invite_code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then raise exception 'try_again'; end if;
  end loop;

  insert into public.circles (name, invite_code, owner_id)
  values (btrim(p_name), v_code, v_user_id)
  returning id into v_circle_id;

  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle_id, v_user_id, 'owner');

  return jsonb_build_object('id', v_circle_id, 'invite_code', v_code);
end;
$$;

create or replace function public.join_circle(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_circle_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  if (
    select count(*) from public.circle_join_attempts a
    where a.user_id = v_user_id and a.attempted_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'too_many_attempts';
  end if;

  select c.id into v_circle_id from public.circles c where c.invite_code = v_code;
  if v_circle_id is null then
    -- Não levanta erro: uma exceção desfaria o registro da tentativa (e o limite nunca valeria).
    -- Código inválido volta como nulo e o app mostra a mensagem.
    insert into public.circle_join_attempts (user_id) values (v_user_id);
    return null;
  end if;

  if public.is_circle_member(v_circle_id, v_user_id) then
    return v_circle_id;
  end if;

  if (select count(*) from public.circle_members m where m.circle_id = v_circle_id) >= 12 then
    raise exception 'circle_full';
  end if;
  if (select count(*) from public.circle_members m where m.user_id = v_user_id) >= 5 then
    raise exception 'too_many_circles';
  end if;

  insert into public.circle_members (circle_id, user_id, role)
  values (v_circle_id, v_user_id, 'member');

  return v_circle_id;
end;
$$;

create or replace function public.leave_circle(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_next uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select m.role into v_role
  from public.circle_members m
  where m.circle_id = p_circle_id and m.user_id = v_user_id;
  if v_role is null then raise exception 'not_member'; end if;

  -- Quem sai leva os próprios pedidos de oração.
  delete from public.prayer_requests r where r.circle_id = p_circle_id and r.author_id = v_user_id;
  delete from public.circle_members m where m.circle_id = p_circle_id and m.user_id = v_user_id;

  if v_role = 'owner' then
    select m.user_id into v_next
    from public.circle_members m
    where m.circle_id = p_circle_id
    order by m.joined_at
    limit 1;

    if v_next is null then
      delete from public.circles c where c.id = p_circle_id;
    else
      update public.circle_members m set role = 'owner'
      where m.circle_id = p_circle_id and m.user_id = v_next;
      update public.circles c set owner_id = v_next where c.id = p_circle_id;
    end if;
  end if;
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

  delete from public.prayer_requests r where r.circle_id = p_circle_id and r.author_id = p_user_id;
  delete from public.circle_members m where m.circle_id = p_circle_id and m.user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leitura: meus círculos e detalhe de um círculo
-- ---------------------------------------------------------------------------
create or replace function public.my_circles()
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
        'id', c.id,
        'name', c.name,
        'role', me.role,
        'invite_code', c.invite_code,
        'member_count', (select count(*) from public.circle_members m where m.circle_id = c.id),
        'did_today_count', (
          select count(*)
          from public.circle_members m
          join public.streaks st on st.user_id = m.user_id
          where m.circle_id = c.id
            and st.last_completed_date >= public.user_local_date(m.user_id)
        )
      )
      order by c.created_at
    )
    from public.circle_members me
    join public.circles c on c.id = me.circle_id
    where me.user_id = v_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.circle_detail(p_circle_id uuid)
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
  if not public.is_circle_member(p_circle_id, v_user_id) then raise exception 'not_member'; end if;

  v_today := public.user_local_date(v_user_id);

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'invite_code', c.invite_code,
    'my_role', me.role,
    -- Total COLETIVO dos últimos 7 dias (momentos distintos por pessoa e dia), sem nomes.
    'week_moments', (
      select count(*) from (
        select distinct s.user_id, (s.completed_at at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date as d
        from public.devotional_sessions s
        join public.circle_members m on m.user_id = s.user_id and m.circle_id = c.id
        join public.profiles p on p.id = s.user_id
        where s.completed_at >= now() - interval '7 days'
      ) x
    ),
    'cheers_received_today', (
      select count(*) from public.circle_cheers ch
      where ch.circle_id = c.id and ch.to_user = v_user_id and ch.day = v_today
    ),
    'members', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'user_id', m.user_id,
          'name', coalesce(nullif(btrim(p.display_name), ''), '—'),
          'role', m.role,
          'is_me', m.user_id = v_user_id,
          'did_today', coalesce(st.last_completed_date >= public.user_local_date(m.user_id), false),
          'cheered_by_me', exists (
            select 1 from public.circle_cheers ch
            where ch.circle_id = c.id and ch.from_user = v_user_id
              and ch.to_user = m.user_id and ch.day = v_today
          )
        )
        order by m.joined_at
      ), '[]'::jsonb)
      from public.circle_members m
      join public.profiles p on p.id = m.user_id
      left join public.streaks st on st.user_id = m.user_id
      where m.circle_id = c.id
    )
  )
  into v_result
  from public.circles c
  join public.circle_members me on me.circle_id = c.id and me.user_id = v_user_id
  where c.id = p_circle_id;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Apoio e pedidos de oração
-- ---------------------------------------------------------------------------
create or replace function public.cheer_circle_member(p_circle_id uuid, p_to_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
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
end;
$$;

create or replace function public.list_prayer_requests(p_circle_id uuid)
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
  if not public.is_circle_member(p_circle_id, v_user_id) then raise exception 'not_member'; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'body', r.body,
        'author_name', coalesce(nullif(btrim(p.display_name), ''), '—'),
        'is_mine', r.author_id = v_user_id,
        'prayed_count', (select count(*) from public.prayer_prayers pp where pp.request_id = r.id),
        'i_prayed', exists (
          select 1 from public.prayer_prayers pp
          where pp.request_id = r.id and pp.user_id = v_user_id
        ),
        'resolved', r.resolved_at is not null,
        'created_at', r.created_at
      )
      order by r.created_at desc
    )
    from (
      select * from public.prayer_requests q
      where q.circle_id = p_circle_id and q.created_at > now() - interval '60 days'
      order by q.created_at desc
      limit 50
    ) r
    join public.profiles p on p.id = r.author_id
  ), '[]'::jsonb);
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
end;
$$;

-- "Gratidão": o autor marca que o pedido foi atendido (ou que não precisa mais de oração).
create or replace function public.resolve_prayer_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.prayer_requests r
  set resolved_at = coalesce(r.resolved_at, now())
  where r.id = p_request_id and r.author_id = auth.uid();

  if not found then raise exception 'forbidden'; end if;
end;
$$;

create or replace function public.delete_prayer_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  delete from public.prayer_requests r
  where r.id = p_request_id
    and (
      r.author_id = auth.uid()
      or exists (
        select 1 from public.circles c where c.id = r.circle_id and c.owner_id = auth.uid()
      )
    );

  if not found then raise exception 'forbidden'; end if;
end;
$$;

create or replace function public.report_circle_content(
  p_circle_id uuid,
  p_request_id uuid,
  p_reported_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if not public.is_circle_member(p_circle_id, v_user_id) then raise exception 'not_member'; end if;

  insert into public.circle_reports (reporter_id, circle_id, request_id, reported_user_id, reason)
  values (v_user_id, p_circle_id, p_request_id, p_reported_user_id, left(coalesce(p_reason, ''), 500));
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões das funções públicas (as auxiliares ficam fechadas)
-- ---------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'create_circle(text)',
    'join_circle(text)',
    'leave_circle(uuid)',
    'remove_circle_member(uuid, uuid)',
    'my_circles()',
    'circle_detail(uuid)',
    'cheer_circle_member(uuid, uuid)',
    'list_prayer_requests(uuid)',
    'create_prayer_request(uuid, text)',
    'pray_for_request(uuid)',
    'resolve_prayer_request(uuid)',
    'delete_prayer_request(uuid)',
    'report_circle_content(uuid, uuid, uuid, text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
