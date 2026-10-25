\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
\set C '''cccc0000-0000-0000-0000-000000000003'''
insert into auth.users (id) values (:A),(:B),(:C) on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users where id in (:A,:B,:C) on conflict (id) do nothing;
truncate public.app_events, public.app_errors;
-- A cadastrou há 40 dias; B e C, há 10 dias.
update public.profiles set created_at = now() - interval '40 days' where id = :A;
update public.profiles set created_at = now() - interval '10 days' where id in (:B,:C);

\echo '== evento válido de A: sem erro; repetir no mesmo dia não duplica (esperado: 1)'
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.track_event('app_open');
select public.track_event('app_open');
reset role;
select 'linhas de A: ' || count(*) from public.app_events where user_id = :A;

\echo '== nome fora da lista falha (esperado: invalid_input)'
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select public.track_event('reflexao_texto');
reset role;

\echo '== sem login não há como registrar evento (esperado: permission denied; o app só chama logado)'
set role anon;
select public.track_event('app_open');
reset role;

\echo '== cliente não lê a tabela de eventos nem o resumo (esperado: permission denied x2)'
set role authenticated;
select count(*) from public.app_events;
select public.metrics_summary();
reset role;
select 'com service: ' || (select count(*) from public.app_events);

\echo '== coorte: A cadastrado há 40 dias e B/C há 10. A e B fazem momento no dia seguinte ao cadastro (ativação 2/3); todos voltam no dia 1 (d1 3/3); B volta em +8 dias, não em +7 (d7 0/3); d30 só conta A (1 madura)'
insert into public.app_events (user_id, name, day) values
  (:A, 'devotional_completed', current_date - 39),
  (:B, 'devotional_completed', current_date - 9),
  (:B, 'app_open', current_date - 9 + 1),
  (:B, 'app_open', current_date - 9 + 7),
  (:C, 'app_open', current_date - 9);
select public.metrics_summary(current_date - 60, current_date)::text;
select 'ativacao quantos (esperado 2: A e B)';
select (public.metrics_summary(current_date - 60, current_date)->'ativacao'->>'quantos');

\echo '== relatório de erro: aspas, e-mail e link saem; texto longo é cortado (esperado: [email], [link], "…")'
set role anon;
select public.report_app_error('tela-x', 'Falhou com "minha reflexão secreta" para ana@exemplo.com em https://exemplo.com/x', repeat('a', 3000), '2.2.0', 'android');
reset role;
select message from public.app_errors;
select 'tamanho do stack: ' || length(stack) from public.app_errors;

\echo '== teto de 300 por hora (esperado: 300 linhas depois de 305 chamadas)'
set role anon;
select public.report_app_error('laco', 'erro', null, null, null) from generate_series(1, 305);
reset role;
select 'total: ' || count(*) from public.app_errors;

\echo '== tabela de erros fechada ao cliente (permission denied)'
set role anon; select count(*) from public.app_errors; reset role;
