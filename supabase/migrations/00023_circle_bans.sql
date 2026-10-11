-- Lumi — quem o criador remove do círculo não volta com o mesmo código de convite.
--
-- Antes, remove_circle_member só tirava a pessoa: com o código (que todos os membros veem), ela
-- entrava de novo na hora e voltava a ver os pedidos de oração. Agora a remoção também registra um
-- veto (circle_bans) e join_circle recusa essa pessoa naquele círculo. A recusa volta como "código
-- inválido" (nulo), igual a um código errado: quem foi vetado não descobre que existe um veto.
-- Sair por conta própria (leave_circle) NÃO veta: a pessoa pode voltar quando quiser.

create table if not exists public.circle_bans (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  banned_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index if not exists circle_bans_user_idx on public.circle_bans (user_id);

alter table public.circle_bans enable row level security;
revoke all on public.circle_bans from anon, authenticated;

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

  -- Removida pelo criador: tratada como código inválido (e conta como tentativa).
  if exists (
    select 1 from public.circle_bans b where b.circle_id = v_circle_id and b.user_id = v_user_id
  ) then
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

-- A remoção em si (apagar pedidos e sair do círculo) continua na função da 00015, agora chamada
-- remove_circle_member_core e fechada ao cliente; a função pública confere o criador, registra o veto
-- e chama a core.
alter function public.remove_circle_member(uuid, uuid) rename to remove_circle_member_core;
revoke execute on function public.remove_circle_member_core(uuid, uuid) from public, anon, authenticated;

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

  insert into public.circle_bans (circle_id, user_id)
  values (p_circle_id, p_user_id)
  on conflict do nothing;

  perform public.remove_circle_member_core(p_circle_id, p_user_id);
end;
$$;

revoke execute on function public.join_circle(text) from public, anon;
grant execute on function public.join_circle(text) to authenticated;
revoke execute on function public.remove_circle_member(uuid, uuid) from public, anon;
grant execute on function public.remove_circle_member(uuid, uuid) to authenticated;
