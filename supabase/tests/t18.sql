\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
-- usuários: Ana(1111) cria o círculo, Bruno(2222) e Carla(3333) entram, Intruso(4444) fica de fora
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333'),('44444444-4444-4444-4444-444444444444') on conflict do nothing;
insert into public.profiles (id) select id from auth.users on conflict do nothing;
update public.profiles set display_name = case id when '11111111-1111-1111-1111-111111111111' then 'Ana' when '22222222-2222-2222-2222-222222222222' then 'Bruno' when '33333333-3333-3333-3333-333333333333' then 'Carla' else 'Intruso' end;
insert into public.profiles (id) select id from auth.users on conflict do nothing;
truncate public.circle_events, public.circle_cheers, public.prayer_prayers, public.prayer_requests, public.circle_members, public.circles cascade;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_circle('Família Silva') as created \gset
select (:'created'::jsonb->>'id') as cid, (:'created'::jsonb->>'invite_code') as code \gset
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.join_circle(:'code') is not null as bruno_joined;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.join_circle(:'code') is not null as carla_joined;

\echo '== acesso direto às tabelas novas deve falhar (x2)'
select * from public.circle_events;
select * from public.device_tokens;

\echo '== Bruno torce por Ana: 1 aviso; repetir no mesmo dia não duplica'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.cheer_circle_member(:'cid'::uuid, '11111111-1111-1111-1111-111111111111');
select public.cheer_circle_member(:'cid'::uuid, '11111111-1111-1111-1111-111111111111');
\echo '== torcer por si mesmo / fora do círculo falha (x2)'
select public.cheer_circle_member(:'cid'::uuid, '22222222-2222-2222-2222-222222222222');
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select public.cheer_circle_member(:'cid'::uuid, '11111111-1111-1111-1111-111111111111');

\echo '== Ana cria pedido: avisa Bruno e Carla (2), não a própria Ana'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_prayer_request(:'cid'::uuid, 'Ore pelo meu trabalho, por favor, é um pedido bem pessoal e longo que não deve aparecer inteiro no aviso xxxxxxxxxxxxxxxxxxxxx') as rid \gset
reset role;
select count(*) as events_new_request from public.circle_events where kind='new_request';
select count(*) as events_new_request_to_ana from public.circle_events where kind='new_request' and recipient_id='11111111-1111-1111-1111-111111111111';
set role authenticated;

\echo '== Bruno ora: Ana recebe 1 aviso; orar de novo não duplica; Ana orar pelo próprio pedido falha'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.pray_for_request(:'rid'::uuid);
select public.pray_for_request(:'rid'::uuid);
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.pray_for_request(:'rid'::uuid);

\echo '== Ana marca gratidão: Bruno recebe 1; marcar de novo não duplica; Bruno marcar falha'
select public.resolve_prayer_request(:'rid'::uuid);
select public.resolve_prayer_request(:'rid'::uuid);
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.resolve_prayer_request(:'rid'::uuid);

\echo '== Ana lê os avisos (cheer + prayed): unread=2, nome do ator e círculo, sem texto completo do pedido'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select (public.my_circle_events()->>'unread') as unread_ana;
select jsonb_pretty(public.my_circle_events(10)->'items');
\echo '== Bruno lê os dele: gratidão + novo pedido não... (new_request vai para Bruno também) => 2 unread'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select (public.my_circle_events()->>'unread') as unread_bruno;
select public.mark_circle_events_read();
select (public.my_circle_events()->>'unread') as unread_bruno_depois;
\echo '== Intruso não vê nada'
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select (public.my_circle_events()->>'unread') as unread_intruso, public.my_circle_events()->'items' as items_intruso;

\echo '== tokens: registrar, trocar de dono, desativar'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.register_device_token('tok_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'android');
select public.register_device_token('tok_curto', 'android');
select public.register_device_token('tok_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'windows');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.register_device_token('tok_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'android');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.deactivate_device_token('tok_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
reset role;
select user_id = '22222222-2222-2222-2222-222222222222' as token_belongs_to_bruno, active as still_active from public.device_tokens;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.deactivate_device_token('tok_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
reset role;
select active as active_after_owner_deactivates from public.device_tokens;
