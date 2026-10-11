\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
\set C '''cccc0000-0000-0000-0000-000000000003'''
insert into auth.users (id) values (:A),(:B),(:C) on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users where id in (:A,:B,:C) on conflict (id) do update set timezone = 'America/Sao_Paulo';
insert into public.streaks (user_id) select id from auth.users where id in (:A,:B,:C) on conflict do nothing;
truncate public.user_challenges, public.circle_challenges, public.circle_events, public.circle_cheers, public.prayer_prayers, public.prayer_requests, public.circle_members, public.circles, public.devotional_sessions cascade;

\echo '== 1. perfil: cliente não apaga nem recria profiles (esperado: 2x permission denied)'
set role authenticated; select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
delete from public.profiles where id = auth.uid();
insert into public.profiles (id, timezone) values (auth.uid(), 'bogus');
reset role;
\echo '== 1b. safe_timezone: America/Sao_Paulo | Asia/Tokyo | America/Sao_Paulo ; user_local_date com fuso inválido não quebra (t)'
select public.safe_timezone('bogus') || ' | ' || public.safe_timezone('Asia/Tokyo') || ' | ' || public.safe_timezone(null);
update public.profiles set timezone = 'bogus' where id = :C;
select public.user_local_date(:C) is not null;
update public.profiles set timezone = 'America/Sao_Paulo' where id = :C;

\echo '== 2. privilégios: truncate negado, delete em devotional_sessions negado (esperado: 2x permission denied)'
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
truncate public.lumi_state;
delete from public.devotional_sessions where user_id = auth.uid();
reset role;

\echo '== 3. prazo vale: 4 dias dentro da janela + 1 atividade DEPOIS do prazo -> expired (não completed)'
select id as c57 from public.challenges where slug='cinco-de-sete' \gset
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false); select public.start_challenge(:'c57'::uuid);
reset role;
update public.user_challenges set started_at = now() - interval '10 days', ends_at = now() - interval '2 days';
insert into public.devotional_sessions (user_id, started_at, completed_at) values
 (:A, now() - interval '8 days', now() - interval '8 days'), (:A, now() - interval '7 days', now() - interval '7 days'),
 (:A, now() - interval '6 days', now() - interval '6 days'), (:A, now() - interval '5 days', now() - interval '5 days'),
 (:A, now() - interval '1 hour', now() - interval '1 hour');
set role authenticated;
select e->>'state' || ' last=' || coalesce(e->>'last_status','-') from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='cinco-de-sete';
reset role;

\echo '== 4. círculo: criador A, membros B e C; B começa; C (sem ser quem começou nem dono) não pode parar'
insert into public.circles (id, name, invite_code, owner_id) values ('dddd0000-0000-0000-0000-00000000000d','T','TTTT1111',:A);
insert into public.circle_members (circle_id, user_id, role, joined_at) values
 ('dddd0000-0000-0000-0000-00000000000d',:A,'owner', now() - interval '3 days'),
 ('dddd0000-0000-0000-0000-00000000000d',:B,'member', now() - interval '3 days'),
 ('dddd0000-0000-0000-0000-00000000000d',:C,'member', now() - interval '3 days');
set role authenticated; select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select (e->>'id') as jid from jsonb_array_elements(public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->'available') e where e->>'title'='Torcida geral' \gset
select public.start_circle_challenge('dddd0000-0000-0000-0000-00000000000d', :'jid'::uuid);
select 'B can_stop=' || (public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->'active'->>'can_stop');
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select 'C can_stop=' || (public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->'active'->>'can_stop');
select public.stop_circle_challenge('dddd0000-0000-0000-0000-00000000000d');
select 'ainda ativo após C tentar parar: ' || ((public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->>'active') is not null);
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select 'A (dono) can_stop=' || (public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->'active'->>'can_stop');
select public.stop_circle_challenge('dddd0000-0000-0000-0000-00000000000d');
select 'ativo após o dono parar: ' || ((public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->>'active') is not null);
reset role;

\echo '== 5. círculo: só conta o que a pessoa fez DEPOIS de entrar e torcidas DESTE círculo'
insert into public.circles (id, name, invite_code, owner_id) values ('eeee0000-0000-0000-0000-00000000000e','Outro','OOOO2222',:A);
insert into public.circle_members (circle_id, user_id, role, joined_at) values ('eeee0000-0000-0000-0000-00000000000e',:A,'owner', now() - interval '3 days'),('eeee0000-0000-0000-0000-00000000000e',:B,'member', now() - interval '3 days');
-- B torce no OUTRO círculo; no círculo D só conta o que for do D
insert into public.circle_cheers (circle_id, from_user, to_user, day) values ('eeee0000-0000-0000-0000-00000000000e',:B,:A,current_date),('eeee0000-0000-0000-0000-00000000000e',:B,:A,current_date - 1);
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.start_circle_challenge('dddd0000-0000-0000-0000-00000000000d', :'jid'::uuid);
reset role;
update public.circle_challenges set started_at = now() - interval '2 days' where status='active';
set role authenticated;
select 'progresso (esperado 0, cheers foram no outro círculo): ' || (public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->'active'->>'progress');
reset role;
insert into public.circle_cheers (circle_id, from_user, to_user, day) values ('dddd0000-0000-0000-0000-00000000000d',:B,:A,current_date);
-- C "entrou" só agora: torcida dele de ontem (antes de entrar) não conta
update public.circle_members set joined_at = now() where user_id = :C and circle_id='dddd0000-0000-0000-0000-00000000000d';
insert into public.circle_cheers (circle_id, from_user, to_user, day) values ('dddd0000-0000-0000-0000-00000000000d',:C,:A,current_date - 1);
set role authenticated;
select 'progresso (esperado 1: só a de B hoje): ' || (public.circle_challenge_state('dddd0000-0000-0000-0000-00000000000d')->'active'->>'progress');
reset role;

\echo '== 6. avisos: some depois de sair do círculo (esperado 1 e depois 0)'
insert into public.circle_events (recipient_id, actor_id, circle_id, kind) values (:B,:A,'dddd0000-0000-0000-0000-00000000000d','cheer');
set role authenticated; select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select (public.my_circle_events()->>'unread') || ' / itens=' || jsonb_array_length(public.my_circle_events()->'items');
reset role;
update public.circle_members set circle_id = circle_id where false;
create temp table _b as select * from public.circle_members where user_id = :B and circle_id='dddd0000-0000-0000-0000-00000000000d';
\echo (remoção simulada por quem tem acesso total)
delete from public.circle_members where user_id = :B and circle_id='dddd0000-0000-0000-0000-00000000000d';
set role authenticated; select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select (public.my_circle_events()->>'unread') || ' / itens=' || jsonb_array_length(public.my_circle_events()->'items');
reset role;

\echo '== 7. teto de sessões abertas em 24h: 10 passam, a 11a falha (too_many_sessions)'
delete from public.devotional_sessions where user_id = :A;
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
insert into public.devotional_sessions (user_id, content_id) select auth.uid(), (select id from public.content limit 1) from generate_series(1,10);
insert into public.devotional_sessions (user_id, content_id) select auth.uid(), (select id from public.content limit 1);
reset role;

\echo '== 8. um plano ativo por pessoa (esperado: unique violation na segunda linha ativa)'
insert into public.user_reading_plans (user_id, plan_id, active) select :A, id, true from public.reading_plans order by id limit 2;
