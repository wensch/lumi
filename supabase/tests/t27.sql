\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
insert into auth.users (id) values (:A),(:B) on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users where id in (:A,:B) on conflict (id) do nothing;
insert into public.streaks (user_id) select id from auth.users where id in (:A,:B) on conflict do nothing;
truncate public.user_challenges, public.circle_challenges, public.circle_cheers, public.circle_members, public.circles, public.user_reading_plans cascade;
\ir ../seed-challenges.sql
delete from public.reading_plan_days where plan_id in (select id from public.reading_plans where owner_id is not null);
delete from public.reading_plans where owner_id is not null;
delete from public.content where owner_id is not null;

set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
\echo '== títulos inválidos: invisível, quebra de linha, escopo nulo, métrica nula (esperado: invalid_input x4)'
select public.create_custom_challenge('personal', null, E'​​​​', '', null, 'prayers', 2, 7);
select public.create_custom_challenge('personal', null, E'Linha1\nLinha2', '', null, 'prayers', 2, 7);
select public.create_custom_challenge(null, null, 'Título ok', '', null, 'prayers', 2, 7);
select public.create_custom_challenge('personal', null, 'Título ok', '', null, null, 2, 7);
\echo '== plano com título invisível e dia com controle (esperado: invalid_input x2)'
select public.create_custom_plan(E'​​​', '', null, null, '[{"title":"x"},{"title":"y"},{"title":"z"}]'::jsonb);
select public.create_custom_plan('Plano ok', '', null, null, jsonb_build_array(jsonb_build_object('title', E'a\nb'), jsonb_build_object('title','y'), jsonb_build_object('title','z')));
\echo '== desafio arquivado do catálogo não começa (esperado: not_found)'
reset role;
update public.challenges set archived_at = now() where slug = 'semana-reflexao';
select id as cref from public.challenges where slug = 'semana-reflexao' \gset
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.start_challenge(:'cref'::uuid);
reset role;
update public.challenges set archived_at = null where slug = 'semana-reflexao';

\echo '== detalhe de plano de evento de edição passada: status none, 0 dias (esperado: none/0/false)'
update public.seasonal_events set starts_on = current_date - 3, ends_on = current_date + 20, lead_days = 7 where slug = 'advento' and year = extract(year from current_date);
select id as adv from public.reading_plans where event_slug = 'advento' \gset
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.start_reading_plan(:'adv'::uuid);
reset role;
update public.user_reading_plans set started_at = now() - interval '400 days', last_day_done = 5 where user_id = :A and plan_id = :'adv'::uuid;
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select (public.reading_plan_detail(:'adv'::uuid)->>'status') || '/' || (public.reading_plan_detail(:'adv'::uuid)->>'last_day_done') || '/' || (public.reading_plan_detail(:'adv'::uuid)->>'done_today');

\echo '== sair do círculo registra a meta batida (esperado: last_status completed, e não active)'
select (public.create_circle('Teste')->>'invite_code') as code \gset
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.join_circle(:'code') is not null;
reset role;
select id as cid from public.circles limit 1 \gset
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.create_custom_challenge('circle', :'cid'::uuid, 'Torcer juntos', '', null, 'cheers', 1, 7) is not null;
select public.cheer_circle_member(:'cid'::uuid, :B) is not null;
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.cheer_circle_member(:'cid'::uuid, :A) is not null;
select public.leave_circle(:'cid'::uuid);
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select 'active=' || coalesce((public.circle_challenge_state(:'cid'::uuid)->'active')::text,'null') || ' last=' || (public.circle_challenge_state(:'cid'::uuid)->>'last_status');
reset role;
