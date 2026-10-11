\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
\set C '''cccc0000-0000-0000-0000-000000000003'''
insert into auth.users (id) values (:A),(:B),(:C) on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users where id in (:A,:B,:C) on conflict (id) do nothing;
truncate public.circle_bans, public.circle_join_attempts, public.circle_members, public.circles cascade;

set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select (public.create_circle('Teste')->>'invite_code') as code \gset
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
\echo '== B entra com o código (esperado: um uuid)'
select public.join_circle(:'code') is not null;
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.join_circle(:'code') is not null;
reset role;
select id as cid from public.circles limit 1 \gset
\echo '== C sai sozinho e volta (esperado: true, true = sair não veta)'
set role authenticated; select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.leave_circle(:'cid'::uuid);
select public.join_circle(:'code') is not null;
\echo '== só o criador remove (B tentando remover C: forbidden)'
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.remove_circle_member(:'cid'::uuid, :C);
\echo '== criador A remove B; B tenta voltar com o mesmo código (esperado: vazio/nulo) e não vê o círculo'
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.remove_circle_member(:'cid'::uuid, :B);
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select 'join B = ' || coalesce(public.join_circle(:'code')::text, 'NULL');
select 'círculos de B: ' || jsonb_array_length(public.my_circles());
\echo '== o veto é só daquele círculo e não de outros (B cria o próprio e outro entra)'
select (public.create_circle('Do B')->>'invite_code') as code2 \gset
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.join_circle(:'code2') is not null;
reset role;
\echo '== circle_bans fechada ao cliente (permission denied)'
set role authenticated; select * from public.circle_bans;
reset role;
select count(*) || ' veto(s)' from public.circle_bans;
