\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('44444444-4444-4444-4444-444444444444') on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users on conflict (id) do nothing;
insert into public.streaks (user_id) select id from auth.users on conflict do nothing;
truncate public.user_challenges, public.circle_challenges, public.user_achievements, public.devotional_sessions, public.circle_cheers, public.prayer_prayers, public.prayer_requests, public.circle_members, public.circles cascade;
\ir ../seed-challenges.sql
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '== tabelas fechadas (x3) e funções internas fechadas (x2)'
select * from public.challenges;
select * from public.user_challenges;
select * from public.circle_challenges;
select public.challenge_metric_value('moments_days','11111111-1111-1111-1111-111111111111', now()-interval '1 day', now());
select public.refresh_user_challenges('11111111-1111-1111-1111-111111111111');
\echo '== lista: 6 pessoais, todos disponíveis'
select jsonb_array_length(public.list_challenges()), (select count(*) from jsonb_array_elements(public.list_challenges()) e where e->>'state'='available');
select (e->>'id') as c57 from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='cinco-de-sete' \gset
select (e->>'id') as cref from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='semana-reflexao' \gset
select (e->>'id') as ccirc from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='semana-torcida' \gset
select (e->>'id') as cmes from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='mes-vinte' \gset
select public.start_challenge(:'c57'::uuid);
select public.start_challenge(:'c57'::uuid);
select count(*) as ativos_sem_duplicar from (select 1) x, lateral (select count(*) from jsonb_array_elements(public.list_challenges()) e where e->>'state'='active') a where a.count = 1;
select public.start_challenge(:'cref'::uuid);
select public.start_challenge(:'ccirc'::uuid);
\echo '== quarto desafio ativo: too_many_active'
select public.start_challenge(:'cmes'::uuid);
\echo '== desafio de círculo não pode ser começado como pessoal / id inexistente'
select public.start_challenge((select id from public.challenges where scope='circle' limit 1));
select public.start_challenge(gen_random_uuid());
\echo '== progresso: 3 momentos em 3 dias diferentes (+2 no mesmo dia que contam 1) -> 3/5; 2 reflexões -> 2/3'
reset role;
update public.user_challenges set started_at = now() - interval '1 hour' where status = 'active';
insert into public.devotional_sessions (user_id, started_at, completed_at, reflection_text) values
 ('11111111-1111-1111-1111-111111111111', now(), now() - interval '3 second', 'uma'),
 ('11111111-1111-1111-1111-111111111111', now(), now() - interval '2 second', 'duas'),
 ('11111111-1111-1111-1111-111111111111', now(), now() - interval '1 second', null);
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select e->>'slug'||'='||(e->>'progress')||'/'||(e->>'target') from jsonb_array_elements(public.list_challenges()) e where e->>'state'='active' order by 1;
\echo '== chegar a 5 dias diferentes completa o desafio cinco-de-sete'
reset role;
update public.user_challenges set started_at = now() - interval '6 days' where challenge_id = (select id from public.challenges where slug='cinco-de-sete');
insert into public.devotional_sessions (user_id, started_at, completed_at) values
 ('11111111-1111-1111-1111-111111111111', now()-interval '1 day', now() - interval '1 day'),
 ('11111111-1111-1111-1111-111111111111', now()-interval '2 day', now() - interval '2 day'),
 ('11111111-1111-1111-1111-111111111111', now()-interval '3 day', now() - interval '3 day'),
 ('11111111-1111-1111-1111-111111111111', now()-interval '4 day', now() - interval '4 day');
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select e->>'slug'||' state='||(e->>'state')||' last='||coalesce(e->>'last_status','-')||' feitos='||(e->>'completed_count') from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='cinco-de-sete';
\echo '== expirar: prazo vencido sem meta'
reset role;
update public.user_challenges set ends_at = now() - interval '1 hour', started_at = now() - interval '8 days' where challenge_id = (select id from public.challenges where slug='semana-reflexao') and status='active';
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select e->>'slug'||' state='||(e->>'state')||' last='||coalesce(e->>'last_status','-') from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='semana-reflexao';
\echo '== recomeçar um expirado funciona; abandonar'
select public.start_challenge(:'cref'::uuid);
select e->>'state' from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='semana-reflexao';
select public.abandon_challenge(:'cref'::uuid);
select e->>'state' from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='semana-reflexao';
\echo '== torcidas e orações como métricas'
reset role;
insert into public.circles (id, name, invite_code, owner_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','T','ZZZZ2222','11111111-1111-1111-1111-111111111111');
insert into public.circle_members (circle_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','owner'),('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','member');
insert into public.circle_cheers (circle_id, from_user, to_user, day) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222', current_date),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222', current_date - 1),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222', current_date - 2);
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select e->>'slug'||' state='||(e->>'state')||' progress='||(e->>'progress') from jsonb_array_elements(public.list_challenges()) e where e->>'slug'='semana-torcida';
\echo '== concluir um momento: conquista challenge_done sai'
reset role;
update public.user_challenges set started_at = now() - interval '2 days' where challenge_id = (select id from public.challenges where slug='semana-torcida');
create or replace function pg_temp.complete_new() returns text language plpgsql as $$
declare v_sid uuid; r record;
begin
  insert into public.devotional_sessions (user_id) values ('11111111-1111-1111-1111-111111111111') returning id into v_sid;
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
  set local role authenticated;
  select * into r from public.complete_devotional_session(v_sid, null);
  reset role;
  return r.unlocked_achievement_codes::text;
end $$;
select pg_temp.complete_new();
select count(*) as challenges_completed from public.user_challenges where status='completed';
\echo '== CÍRCULO: não membro falha; disponível com meta = por pessoa x membros (2): 8/4/4'
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select string_agg((e->>'title')||'='||(e->>'target'), ' | ' order by e->>'title') from jsonb_array_elements(public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'available') e;
select (e->>'id') as jid from jsonb_array_elements(public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'available') e where e->>'title'='Torcida geral' \gset
select public.start_circle_challenge('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'jid'::uuid);
\echo '== segundo membro não pode começar outro (already_active); desafio pessoal não vira de círculo'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.start_circle_challenge('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'jid'::uuid);
select public.start_circle_challenge('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select id from public.challenges where slug='semana-torcida'));
\echo '== progresso do círculo soma torcidas de todos (3 da Ana ainda dentro da janela? começou agora -> 0)'
select (public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'active'->>'progress') as progress_inicial, (public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'active'->>'target') as meta;
reset role;
update public.circle_challenges set started_at = now() - interval '5 days' where status = 'active';
update public.circle_members set joined_at = now() - interval '6 days';
insert into public.circle_cheers (circle_id, from_user, to_user, day) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111', current_date),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111', current_date - 1);
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select (public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->'active'->>'progress') as progress_depois;
\echo '== meta batida (4): completa e libera novo; conquista juntos'
reset role;
insert into public.circle_cheers (circle_id, from_user, to_user, day) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111', current_date - 2),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111', current_date - 3);
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select (public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'active') is null as sem_ativo, public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'last_status', public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'completed_count';
select public.start_circle_challenge('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'jid'::uuid);
select public.stop_circle_challenge('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select (public.circle_challenge_state('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'active') is null as parou;
reset role;
select pg_temp.complete_new();
