\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
insert into auth.users (id) values (:A),(:B) on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users where id in (:A,:B) on conflict (id) do nothing;
insert into public.streaks (user_id) select id from auth.users where id in (:A,:B) on conflict do nothing;
truncate public.user_challenges, public.circle_challenges, public.circle_cheers, public.circle_members, public.circles cascade;
\ir ../seed-challenges.sql

select id as oracao from public.challenges where slug = 'semana-oracao' \gset
select id as mes from public.challenges where slug = 'mes-vinte' \gset

\echo '== sem desafios concluídos (esperado: {})'
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.my_challenge_rewards();

\echo '== A conclui "semana-oracao" e um desafio próprio, e arquiva o próprio (esperado: {custom,semana-oracao})'
select public.start_challenge(:'oracao'::uuid);
select public.create_custom_challenge('personal', null, 'Meu desafio', '', null, 'prayers', 2, 7) as mine \gset
reset role;
update public.user_challenges set status = 'completed', completed_at = now() where user_id = :A;
update public.challenges set archived_at = now() where owner_id = :A;
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.my_challenge_rewards();

\echo '== B (nada concluído) continua vazio (esperado: {})'
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.my_challenge_rewards();

\echo '== desafio abandonado ou em andamento não conta (esperado: {})'
select public.start_challenge(:'mes'::uuid);
select public.my_challenge_rewards();

\echo '== anônimo não chama (esperado: permission denied)'
reset role; set role anon;
select public.my_challenge_rewards();
reset role;
