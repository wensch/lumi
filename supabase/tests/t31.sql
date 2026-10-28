\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
\set C '''cccc0000-0000-0000-0000-000000000003'''
insert into auth.users (id) values (:A),(:B),(:C) on conflict do nothing;
insert into public.profiles (id, timezone, display_name) values (:A, 'America/Sao_Paulo', 'Ana'), (:B, 'America/Sao_Paulo', 'Bia'), (:C, 'America/Sao_Paulo', 'Cris')
  on conflict (id) do update set display_name = excluded.display_name;
insert into public.streaks (user_id) select id from auth.users where id in (:A,:B,:C) on conflict do nothing;
truncate public.user_challenges, public.circle_join_attempts, public.challenge_invites cascade;
delete from public.challenges where owner_id is not null;
\ir ../seed-challenges.sql
select id as pray from public.challenges where slug = 'semana-oracao' \gset

\echo '== A sem desafio ativo não convida (esperado: not_found)'
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.create_challenge_invite(:'pray'::uuid);

\echo '== A cria desafio próprio e convida (esperado: código de 8 caracteres, o mesmo na segunda chamada: t/t)'
select public.create_custom_challenge('personal', null, 'Orar juntos', 'Orar 3 vezes', '🙏', 'prayers', 3, 7) as mine \gset
select public.create_challenge_invite(:'mine'::uuid) as code \gset
select length(:'code') = 8, public.create_challenge_invite(:'mine'::uuid) = :'code';

\echo '== B vê a prévia (esperado: título, Ana, 1 pessoa, joined f, already_active f)'
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select p->>'title', p->>'inviter_name', p->>'people', p->>'joined', p->>'already_active'
from (select public.challenge_invite_preview(lower(:'code')) as p) s;

\echo '== código inválido: nulo e conta tentativa (esperado: vazio / 1)'
select public.challenge_invite_preview('ZZZZZZZZ') is null;
reset role; select count(*) from public.circle_join_attempts where user_id = :B;
set role authenticated; select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);

\echo '== B aceita (esperado: id do desafio) e aceitar de novo é inofensivo (t)'
select public.accept_challenge_invite(:'code') = :'mine'::uuid;
select public.accept_challenge_invite(:'code') = :'mine'::uuid;

\echo '== B enxerga o desafio de A na lista: ativo, convidado, grupo de 2 (esperado: active/t/2)'
select e->>'state', e->>'invited', e->>'group_size'
from jsonb_array_elements(public.list_challenges()) e where e->>'id' = :'mine';

\echo '== grupo visto por B: Bia (eu) e Ana, nenhuma com progresso (esperado: 2 linhas)'
select string_agg((x->>'name') || ':' || (x->>'is_me') || ':' || (x->>'status') || ':' || (x->>'progress'), ' | ' order by x->>'name')
from jsonb_array_elements(public.challenge_group_state(:'mine'::uuid)) x;

\echo '== de fora (C): grupo vazio e prévia ainda funciona (esperado: [] / t)'
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.challenge_group_state(:'mine'::uuid);
select (public.challenge_invite_preview(:'code'))->>'joined' = 'false';

\echo '== A reabre a lista: o desafio dela continua sem "convidado" (esperado: t/f? -> invited f, group_size 2)'
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select e->>'invited', e->>'group_size'
from jsonb_array_elements(public.list_challenges()) e where e->>'id' = :'mine';

\echo '== progresso: A reza 3x (meta 3) e B reza 1x (esperado: Ana completed 3 | Bia active 1)'
reset role;
update public.user_challenges set started_at = now() - interval '1 hour' where challenge_id = :'mine'::uuid;
insert into public.circles (id, name, invite_code, owner_id) values ('11110000-0000-0000-0000-000000000001', 'Cc', 'XXXXXXXX', :C) on conflict do nothing;
insert into public.prayer_requests (id, circle_id, author_id, body) values
  ('22220000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000001', :C, 'x'),
  ('22220000-0000-0000-0000-000000000002', '11110000-0000-0000-0000-000000000001', :C, 'y'),
  ('22220000-0000-0000-0000-000000000003', '11110000-0000-0000-0000-000000000001', :C, 'z') on conflict do nothing;
insert into public.prayer_prayers (request_id, user_id, created_at) values
  ('22220000-0000-0000-0000-000000000001', :A, now()), ('22220000-0000-0000-0000-000000000002', :A, now()),
  ('22220000-0000-0000-0000-000000000003', :A, now()), ('22220000-0000-0000-0000-000000000001', :B, now());
set role authenticated; select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select string_agg((x->>'name') || ' ' || (x->>'status') || ' ' || (x->>'progress') || '/' || (x->>'target'), ' | ' order by x->>'name')
from jsonb_array_elements(public.challenge_group_state(:'mine'::uuid)) x;

\echo '== o grupo não vaza dados além do andamento (esperado: só name,is_me,status,progress,target)'
select string_agg(distinct k, ',' order by k) from jsonb_array_elements(public.challenge_group_state(:'mine'::uuid)) x, jsonb_object_keys(x) k;

\echo '== recompensa: A concluiu o desafio próprio (esperado: {custom})'
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.my_challenge_rewards();

\echo '== lotação: 8 pessoas por convite (esperado: 6 entram, a 9ª recebe invite_full)'
reset role;
insert into auth.users (id) select ('dddd0000-0000-0000-0000-00000000000' || g)::uuid from generate_series(1, 7) g on conflict do nothing;
insert into public.profiles (id, timezone, display_name) select ('dddd0000-0000-0000-0000-00000000000' || g)::uuid, 'America/Sao_Paulo', 'D' || g from generate_series(1, 7) g on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub', 'dddd0000-0000-0000-0000-00000000000' || g, false), public.accept_challenge_invite(:'code') is not null from generate_series(1, 5) g;
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.accept_challenge_invite(:'code') is not null;
select set_config('request.jwt.claim.sub','dddd0000-0000-0000-0000-000000000006',false);
select public.accept_challenge_invite(:'code');

\echo '== limite de 3 desafios ativos vale ao aceitar (esperado: too_many_active)'
reset role;
select id as c1 from public.challenges where slug = 'semana-constancia' \gset
select id as c2 from public.challenges where slug = 'cinco-de-sete' \gset
select id as c3 from public.challenges where slug = 'semana-reflexao' \gset
delete from public.challenge_participants where user_id = 'dddd0000-0000-0000-0000-000000000005'::uuid;
set role authenticated; select set_config('request.jwt.claim.sub','dddd0000-0000-0000-0000-000000000007',false);
select public.start_challenge(:'c1'::uuid), public.start_challenge(:'c2'::uuid), public.start_challenge(:'c3'::uuid);
select public.accept_challenge_invite(:'code');

\echo '== desafio arquivado pelo dono: convite deixa de valer (esperado: t)'
reset role;
update public.challenges set archived_at = now() where id = :'mine'::uuid;
set role authenticated; select set_config('request.jwt.claim.sub','dddd0000-0000-0000-0000-000000000006',false);
select public.challenge_invite_preview(:'code') is null;

\echo '== anônimo não chama nenhuma (esperado: 4x permission denied)'
reset role; set role anon;
select public.create_challenge_invite(:'mine'::uuid);
select public.challenge_invite_preview('ABCDEFGH');
select public.accept_challenge_invite('ABCDEFGH');
select public.challenge_group_state(:'mine'::uuid);
reset role;
