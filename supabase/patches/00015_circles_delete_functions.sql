-- Lumi — 00015 (Círculos): as 3 funções que apagam dados. Cole inteiro no SQL Editor e toque em Run.
-- (O conector do Supabase não aplica trechos com DELETE sem confirmação; o resto do 00015 já foi aplicado.)

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

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'leave_circle(uuid)',
    'remove_circle_member(uuid, uuid)',
    'delete_prayer_request(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
