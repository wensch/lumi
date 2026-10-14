\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
\set C '''cccc0000-0000-0000-0000-000000000003'''
insert into auth.users (id) values (:A),(:B),(:C) on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users where id in (:A,:B,:C) on conflict (id) do nothing;
truncate public.circle_bans, public.circle_join_attempts, public.circle_members, public.circles, public.user_challenges, public.circle_challenges cascade;
delete from public.challenges where owner_id is not null or circle_id is not null;

set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select (public.create_circle('Teste')->>'invite_code') as code \gset
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.join_circle(:'code') is not null;
reset role;
select id as cid from public.circles limit 1 \gset

set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
\echo '== A cria desafio pessoal (esperado: um uuid) e ele já começa'
select public.create_custom_challenge('personal', null, 'Ler todo dia', 'Minha meta', '📖', 'moments_days', 5, 7) is not null;
select 'ativos de A: ' || count(*) from jsonb_array_elements(public.list_challenges()) e where e->>'state' = 'active' and (e->>'custom')::boolean;
\echo '== B não vê o desafio pessoal de A (esperado: 0)'
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select 'custom visíveis p/ B: ' || count(*) from jsonb_array_elements(public.list_challenges()) e where (e->>'custom')::boolean;
\echo '== validações (esperado: invalid_input em todas)'
select public.create_custom_challenge('personal', null, 'ab', '', null, 'moments_days', 3, 7);
select public.create_custom_challenge('personal', null, 'Título ok', '', null, 'moments_days', 9, 7);
select public.create_custom_challenge('personal', null, 'Título ok', '', null, 'xyz', 3, 7);
select public.create_custom_challenge('personal', null, 'Título ok', '', null, 'prayers', 0, 7);
select public.create_custom_challenge('personal', null, 'Título ok', '', null, 'prayers', 3, 61);
select public.create_custom_challenge('galaxy', null, 'Título ok', '', null, 'prayers', 3, 7);
\echo '== desafio de círculo: B (membro) cria; meta = por pessoa x membros (esperado: target 6 = 3 x 2)'
select public.create_custom_challenge('circle', :'cid'::uuid, 'Orar juntos', 'Uma oração por dia', '🙏', 'prayers', 3, 7) is not null;
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select 'ativo: ' || (public.circle_challenge_state(:'cid'::uuid)->'active'->>'title') || ' meta ' || (public.circle_challenge_state(:'cid'::uuid)->'active'->>'target');
\echo '== segundo desafio no círculo enquanto há um ativo (esperado: already_active, e nada criado)'
select public.create_custom_challenge('circle', :'cid'::uuid, 'Outro', '', null, 'cheers', 2, 7);
reset role;
select 'modelos custom do círculo: ' || count(*) from public.challenges where circle_id = :'cid'::uuid;
select id as ch_circle from public.challenges where circle_id = :'cid'::uuid limit 1 \gset
select id as ch_personal from public.challenges where owner_id = :A limit 1 \gset
set role authenticated;
\echo '== fora do círculo (C não é membro) (esperado: not_member)'
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.create_custom_challenge('circle', :'cid'::uuid, 'Intruso', '', null, 'cheers', 2, 7);
select public.circle_challenge_state(:'cid'::uuid);
\echo '== C não inicia desafio custom de outro círculo nem pessoal de A'
select public.start_challenge(:'ch_personal'::uuid);
\echo '== arquivar: A (dono do círculo) arquiva o modelo criado por B; C não pode'
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.stop_circle_challenge(:'cid'::uuid);
select 'opções no círculo: ' || jsonb_array_length(public.circle_challenge_state(:'cid'::uuid)->'available') || ' (custom: ' || (select count(*) from jsonb_array_elements(public.circle_challenge_state(:'cid'::uuid)->'available') e where (e->>'custom')::boolean) || ')';
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.archive_custom_challenge(:'ch_circle'::uuid);
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.archive_custom_challenge(:'ch_circle'::uuid);
select 'custom após arquivar: ' || (select count(*) from jsonb_array_elements(public.circle_challenge_state(:'cid'::uuid)->'available') e where (e->>'custom')::boolean);
\echo '== limite de 3 desafios pessoais ativos (esperado: too_many_active no 4º, que não é criado)'
select public.create_custom_challenge('personal', null, 'Segundo', '', null, 'reflections', 2, 7) is not null;
select public.create_custom_challenge('personal', null, 'Terceiro', '', null, 'cheers', 2, 7) is not null;
select public.create_custom_challenge('personal', null, 'Quarto', '', null, 'prayers', 2, 7);
reset role;
select 'modelos de A: ' || count(*) from public.challenges where owner_id = :A;
\echo '== tabela fechada ao cliente (permission denied)'
set role authenticated; select count(*) from public.challenges;
reset role;
