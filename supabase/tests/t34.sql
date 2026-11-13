\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
begin;
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
\set C '''cccc0000-0000-0000-0000-000000000003'''
insert into auth.users (id) values (:A),(:B),(:C) on conflict do nothing;
insert into public.profiles (id, timezone, display_name) values (:A, 'America/Sao_Paulo', 'Ana'), (:B, 'America/Sao_Paulo', 'Bia'), (:C, 'America/Sao_Paulo', 'Cris')
  on conflict (id) do update set display_name = excluded.display_name;
insert into public.streaks (user_id) select id from auth.users where id in (:A,:B,:C) on conflict do nothing;
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select r->>'id' as k1, r->>'invite_code' as code1 from (select public.create_circle('Circulo da Ana') r) s \gset
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.join_circle(:'code1') ;
select r->>'id' as k2, r->>'invite_code' as code2 from (select public.create_circle('Circulo da Bia') r) s \gset
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.join_circle(:'code1');
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.join_circle(:'code2');
-- pedidos de oracao
select public.create_prayer_request(:'k1'::uuid, 'pedido da Ana no K1') as pa1_raw \gset
reset role; select id as pa1 from public.prayer_requests where circle_id=:'k1'::uuid and body='pedido da Ana no K1' \gset
set role authenticated;
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.create_prayer_request(:'k1'::uuid, 'pedido da Bia no K1') as pb1_raw \gset
reset role; select id as pb1 from public.prayer_requests where circle_id=:'k1'::uuid and body='pedido da Bia no K1' \gset
set role authenticated;
select public.create_prayer_request(:'k2'::uuid, 'pedido da Bia no K2') as pb2_raw \gset
reset role; select id as pb2 from public.prayer_requests where circle_id=:'k2'::uuid and body='pedido da Bia no K2' \gset
set role authenticated;
select public.pray_for_request(:'pa1'::uuid);
select public.cheer_circle_member(:'k1'::uuid, 'aaaa0000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.pray_for_request(:'pb1'::uuid);
select public.pray_for_request(:'pb2'::uuid);
select public.cheer_circle_member(:'k1'::uuid, 'bbbb0000-0000-0000-0000-000000000002');
-- denuncias
select public.report_circle_content(:'k1'::uuid, :'pb1'::uuid, 'bbbb0000-0000-0000-0000-000000000002', 'denuncia da Ana sobre Bia');
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.report_circle_content(:'k1'::uuid, :'pa1'::uuid, 'aaaa0000-0000-0000-0000-000000000001', 'denuncia da Bia sobre Ana');
-- desafio proprio da Ana + convite aceito por Bia
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.create_custom_challenge('personal', null, 'Orar juntos', 'Orar 3 vezes', '🙏', 'prayers', 3, 7) as mine \gset
select public.create_challenge_invite(:'mine'::uuid) as code \gset
-- desafio de circulo criado pela Ana no K1 e iniciado
select public.create_custom_challenge('circle', :'k1'::uuid, 'Circulo orando', 'Orar', '🙏', 'prayers', 5, 7) as cc \gset
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select public.accept_challenge_invite(:'code');
-- Bia pede convite proprio tambem; Cris aceita o convite da Ana
select set_config('request.jwt.claim.sub','cccc0000-0000-0000-0000-000000000003',false);
select public.accept_challenge_invite(:'code');
-- plano proprio da Ana
reset role;
create temp table snap(tag text, tabela text, n bigint);
create or replace function pg_temp.contar(p_tag text) returns void language plpgsql as $f$
declare B uuid := 'bbbb0000-0000-0000-0000-000000000002'; C uuid := 'cccc0000-0000-0000-0000-000000000003';
begin
 insert into snap select p_tag,'circles (de B/C ou K2)', count(*) from public.circles where owner_id in (B,C);
 insert into snap select p_tag,'circles total', count(*) from public.circles;
 insert into snap select p_tag,'circle_members de B e C', count(*) from public.circle_members where user_id in (B,C);
 insert into snap select p_tag,'prayer_requests de B e C', count(*) from public.prayer_requests where author_id in (B,C);
 insert into snap select p_tag,'prayer_prayers de B e C', count(*) from public.prayer_prayers where user_id in (B,C);
 insert into snap select p_tag,'circle_cheers de/para B e C', count(*) from public.circle_cheers where from_user in (B,C) or to_user in (B,C);
 insert into snap select p_tag,'circle_events para B e C', count(*) from public.circle_events where recipient_id in (B,C);
 insert into snap select p_tag,'circle_challenges', count(*) from public.circle_challenges;
 insert into snap select p_tag,'user_challenges de B e C', count(*) from public.user_challenges where user_id in (B,C);
 insert into snap select p_tag,'challenge_participants B e C', count(*) from public.challenge_participants where user_id in (B,C);
 insert into snap select p_tag,'challenge_invites total', count(*) from public.challenge_invites;
 insert into snap select p_tag,'challenges proprios total', count(*) from public.challenges where owner_id is not null or circle_id is not null;
 insert into snap select p_tag,'circle_reports total', count(*) from public.circle_reports;
 insert into snap select p_tag,'circle_reports reported_user_id=A (orfas)', count(*) from public.circle_reports where reported_user_id='aaaa0000-0000-0000-0000-000000000001';
 insert into snap select p_tag,'circle_reports cujo reporter_id existe', count(*) from public.circle_reports r where exists(select 1 from auth.users u where u.id=r.reporter_id);
 insert into snap select p_tag,'circle_bans', count(*) from public.circle_bans;
end $f$;

select pg_temp.contar('antes');
select 'perfil/dado de A:', (select count(*) from public.profiles where id=:A), (select count(*) from public.streaks where user_id=:A);
delete from auth.users where id = :A;
select pg_temp.contar('depois');

\echo '== (00036) esperado: K1 continua (agora da Bia), desafio de A passa a ser de quem começou primeiro, nenhuma denúncia aponta para A'
select 'circulo K1 existe e dono é B:', (select owner_id = 'bbbb0000-0000-0000-0000-000000000002'::uuid from public.circles where id = :'k1'::uuid);
select 'B e C continuam no K1:', (select count(*) from public.circle_members where circle_id = :'k1'::uuid and user_id in ('bbbb0000-0000-0000-0000-000000000002','cccc0000-0000-0000-0000-000000000003'));
select 'pedido de B no K1 continua:', (select count(*) from public.prayer_requests where circle_id = :'k1'::uuid and author_id = 'bbbb0000-0000-0000-0000-000000000002');
select 'pedido de A no K1 saiu:', (select count(*) from public.prayer_requests where circle_id = :'k1'::uuid and author_id = 'aaaa0000-0000-0000-0000-000000000001');
select 'desafios de B e C continuam:', (select count(*) from public.user_challenges where user_id in ('bbbb0000-0000-0000-0000-000000000002','cccc0000-0000-0000-0000-000000000003'));
select 'denúncias apontando para A:', (select count(*) from public.circle_reports where reported_user_id = 'aaaa0000-0000-0000-0000-000000000001');
select 'denúncias guardadas (esperado 2):', (select count(*) from public.circle_reports);
select 'denúncia feita por A sem identificar:', (select count(*) from public.circle_reports where reporter_id is null);

\echo '== A como único membro: o círculo some com ela (esperado: 0)'
reset role;
insert into auth.users (id) values ('dddd0000-0000-0000-0000-000000000004') on conflict do nothing;
insert into public.profiles (id, timezone, display_name) values ('dddd0000-0000-0000-0000-000000000004', 'America/Sao_Paulo', 'Dani') on conflict (id) do nothing;
set role authenticated; select set_config('request.jwt.claim.sub','dddd0000-0000-0000-0000-000000000004',false);
select r->>'id' as k3 from (select public.create_circle('Circulo so da Dani') r) s \gset
reset role;
delete from auth.users where id = 'dddd0000-0000-0000-0000-000000000004';
select count(*) from public.circles where id = :'k3'::uuid;

\echo '== retenção: purge_old_data apaga o antigo e preserva o recente; ninguém de fora executa'
insert into public.app_errors (source, message, created_at) values ('t', 'velho', now() - interval '61 days'), ('t', 'novo', now() - interval '1 day');
select 'removidos:', (public.purge_old_data())->>'app_errors';
select 'erros restantes (esperado 1):', (select count(*) from public.app_errors where source = 't');
rollback;
\echo '== ninguém de fora executa a limpeza (esperado: permission denied x2)'
set role authenticated;
select public.purge_old_data();
reset role;
set role anon;
select public.purge_old_data();
reset role;

\echo '== scrub_error_text (00038): aspas curvas, crases e token somem'
select public.scrub_error_text(E'x “texto da pessoa” e `reflexão` a@b.com http://x.y eyJhbGciOiJIUzI1NiJ9.abc.def fim');
