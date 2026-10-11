\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
insert into auth.users (id) values (:A) on conflict do nothing;
insert into public.profiles (id, timezone) values (:A, 'America/Sao_Paulo') on conflict (id) do update set timezone='America/Sao_Paulo';
insert into public.streaks (user_id) values (:A) on conflict do nothing;
truncate public.user_reading_plans, public.devotional_sessions, public.user_achievements cascade;
-- janelas de teste relativas a hoje: Advento em andamento, Páscoa chegando (dentro de 7 dias), Natal longe
update public.seasonal_events set starts_on = date '2090-01-01', ends_on = date '2090-01-10' where year = extract(year from current_date)::int;
update public.seasonal_events set starts_on = current_date - 2, ends_on = current_date + 20, lead_days = 7 where slug='advento' and year = extract(year from current_date)::int;
update public.seasonal_events set starts_on = current_date + 5, ends_on = current_date + 13, lead_days = 7 where slug='pascoa' and year = extract(year from current_date)::int;
select 'sanidade: ' || count(*) || ' janelas do ano' from public.seasonal_events where year = extract(year from current_date)::int;

select id as pnatal from public.reading_plans where slug='natal' \gset
select id as padv from public.reading_plans where slug='advento' \gset
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
\echo '== 1. active_events: advento (now) primeiro, pascoa (soon) depois; natal fora (esperado: advento/now/none, pascoa/soon/none)'
select string_agg((e->>'slug') || '/' || (e->>'state') || '/' || (e->>'status') || '/' || (e->>'days'), ' , ' order by n) from jsonb_array_elements(public.active_events()) with ordinality as t(e, n);
\echo '== 2. lista de planos: eventos só na época (esperado: advento e pascoa presentes, natal ausente; planos normais = 6)'
select (select count(*) from jsonb_array_elements(public.list_reading_plans()) e where e->>'event_slug' is null) || ' normais | eventos: ' || coalesce((select string_agg(e->>'slug', ',') from jsonb_array_elements(public.list_reading_plans()) e where e->>'event_slug' is not null), '-');
\echo '== 3. começar o natal fora da época (esperado: not_available)'
select public.start_reading_plan(:'pnatal'::uuid);
\echo '== 4. começar o advento e ver o devocional do dia 1'
select public.start_reading_plan(:'padv'::uuid);
select (public.active_reading_plan()->>'title') || ' dia ' || (public.active_reading_plan()->>'next_day') || '/' || (public.active_reading_plan()->>'days');
reset role;
select 'conteúdo do dia 1 é de evento: ' || c.seasonal || ' (' || c.title || ')' from public.content c where c.id = (select content_id from public.reading_plan_days d join public.reading_plans p on p.id=d.plan_id where p.slug='advento' and d.day_number=1);

\echo '== 5. concluir os 24 dias (um por dia do calendário) libera event_advento'
create or replace function pg_temp.do_day() returns text language plpgsql as $$
declare v_plan jsonb; v_sid uuid; r record;
begin
  perform set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
  set local role authenticated;
  v_plan := public.active_reading_plan();
  reset role;
  if v_plan is null then return 'sem plano ativo'; end if;
  insert into public.devotional_sessions (user_id, content_id, started_at) values ('aaaa0000-0000-0000-0000-000000000001', (v_plan->>'content_id')::uuid, now() - interval '30 days') returning id into v_sid;
  -- um dia do plano por dia do calendário: finge que o último foi ontem
  update public.user_reading_plans set last_day_done_on = current_date - 1 where user_id = 'aaaa0000-0000-0000-0000-000000000001' and active;
  update public.streaks set last_completed_date = current_date - 1 where user_id = 'aaaa0000-0000-0000-0000-000000000001';
  set local role authenticated;
  select * into r from public.complete_devotional_session(v_sid, null);
  reset role;
  return array_to_string(r.unlocked_achievement_codes, ',');
end $$;
select string_agg(nullif(pg_temp.do_day(),''), ' | ') filter (where true) from generate_series(1,24);
select 'plano advento: ' || coalesce((select 'completed=' || (completed_at is not null) || ', active=' || active || ', dias=' || last_day_done from public.user_reading_plans up join public.reading_plans p on p.id=up.plan_id where p.slug='advento' and up.user_id = :A), 'sem linha');
select 'conquista event_advento: ' || exists (select 1 from public.user_achievements ua join public.achievements a on a.id=ua.achievement_id where ua.user_id = :A and a.code='event_advento');
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select 'active_events após concluir: ' || (select string_agg((e->>'slug') || '=' || (e->>'status'), ',') from jsonb_array_elements(public.active_events()) e);
reset role;

\echo '== 6. progresso de outra edição (ano anterior) não vale: some e recomeça do dia 1'
update public.user_reading_plans set started_at = now() - interval '400 days' where user_id = :A;
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select 'status do advento com progresso antigo: ' || (select e->>'status' || '/' || (e->>'last_day_done') from jsonb_array_elements(public.active_events()) e where e->>'slug'='advento');
select public.start_reading_plan(:'padv'::uuid);
select 'após recomeçar: ' || (public.active_reading_plan()->>'next_day') || '/' || (public.active_reading_plan()->>'days');
reset role;

\echo '== 7. plano de evento esquecido ativo de um ano passado não vira "devocional do dia" fora da época'
update public.user_reading_plans set started_at = now() - interval '400 days', active = true, completed_at = null, last_day_done = 12 where user_id = :A;
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select 'active_reading_plan (esperado vazio): [' || coalesce(public.active_reading_plan()::text, '') || ']';
reset role;

\echo '== 8. tabelas de evento fechadas ao cliente (permission denied)'
set role authenticated; select * from public.seasonal_events;
reset role;
