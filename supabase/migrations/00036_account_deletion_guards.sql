-- Lumi — apagar uma conta sem prejudicar outras pessoas (achados T-004 e T-005 do loop de agentes).
--
-- Antes: `delete from auth.users` apagava, em cascata, o círculo de quem era dona (com os pedidos de oração e os
-- registros dos outros membros), os desafios próprios que outras pessoas faziam e a denúncia que a pessoa tinha feito.
-- Agora um gatilho BEFORE DELETE prepara os dados na mesma transação, qualquer que seja o caminho da exclusão
-- (função de servidor, painel do Supabase ou pedido por e-mail):
--   1. círculos: a pessoa sai de cada um; se era dona, a posse passa ao membro mais antigo; sem membros, o círculo sai;
--   2. desafio próprio que outras pessoas fazem: passa a quem começou primeiro;
--   3. denúncias: continuam guardadas sem identificar a pessoa (reporter_id vira nulo, reported_user_id vira nulo).
-- O que a pessoa fez PARA os outros (pedidos de oração dela, "orei", "torci") sai junto com a conta, por desenho.

alter table public.circle_reports alter column reporter_id drop not null;
alter table public.circle_reports drop constraint if exists circle_reports_reporter_id_fkey;
alter table public.circle_reports
  add constraint circle_reports_reporter_id_fkey foreign key (reporter_id) references auth.users (id) on delete set null;

create or replace function public.prepare_user_deletion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_next uuid;
begin
  for r in select m.circle_id, m.role from public.circle_members m where m.user_id = old.id loop
    delete from public.prayer_requests where circle_id = r.circle_id and author_id = old.id;
    delete from public.circle_members where circle_id = r.circle_id and user_id = old.id;
    if r.role = 'owner' then
      select m.user_id into v_next
      from public.circle_members m
      where m.circle_id = r.circle_id
      order by m.joined_at
      limit 1;
      if v_next is null then
        delete from public.circles where id = r.circle_id;
      else
        update public.circle_members set role = 'owner' where circle_id = r.circle_id and user_id = v_next;
        update public.circles set owner_id = v_next where id = r.circle_id;
      end if;
    end if;
  end loop;

  for r in select c.id from public.challenges c where c.owner_id = old.id loop
    select uc.user_id into v_next
    from public.user_challenges uc
    where uc.challenge_id = r.id and uc.user_id <> old.id
    order by uc.started_at
    limit 1;
    if v_next is not null then
      update public.challenges set owner_id = v_next where id = r.id;
    end if;
  end loop;

  update public.circle_reports set reported_user_id = null where reported_user_id = old.id;
  return old;
end;
$$;

revoke execute on function public.prepare_user_deletion() from public, anon, authenticated;

create trigger prepare_user_deletion before delete on auth.users
  for each row execute function public.prepare_user_deletion();
