\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111') on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users on conflict (id) do nothing;
insert into public.streaks (user_id) select id from auth.users on conflict do nothing;
truncate public.user_reading_plans, public.user_achievements, public.devotional_sessions cascade;
create or replace function pg_temp.complete_content(p_title text) returns text language plpgsql as $$
declare v_sid uuid; r record;
begin
  insert into public.devotional_sessions (user_id, content_id)
  select '11111111-1111-1111-1111-111111111111', c.id from public.content c where c.title = p_title returning id into v_sid;
  perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
  set local role authenticated;
  select * into r from public.complete_devotional_session(v_sid, null);
  reset role;
  return coalesce(r.unlocked_achievement_codes::text,'');
end $$;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
\echo '== tabelas fechadas (x3)'
select * from public.reading_plans;
select * from public.reading_plan_days;
select * from public.user_reading_plans;
\echo '== lista: 6 planos, todos none'
select jsonb_array_length(public.list_reading_plans()), (select count(*) from jsonb_array_elements(public.list_reading_plans()) e where e->>'status'='none');
\echo '== sem plano ativo: nulo'
select public.active_reading_plan() is null;
\echo '== começar plano inexistente falha'
select public.start_reading_plan(gen_random_uuid());
select id as pid from public.reading_plan_detail((select (e->>'id')::uuid from jsonb_array_elements(public.list_reading_plans()) e where e->>'slug'='descanso')) as id(id) \gset
select (e->>'id') as pid from jsonb_array_elements(public.list_reading_plans()) e where e->>'slug'='descanso' \gset
select (e->>'id') as pid2 from jsonb_array_elements(public.list_reading_plans()) e where e->>'slug'='confianca' \gset
select public.start_reading_plan(:'pid'::uuid);
\echo '== ativo: dia 1 = Um convite para quem está cansado, done_today false'
select public.active_reading_plan()->>'next_day', (select title from public.content where id = (public.active_reading_plan()->>'content_id')::uuid), public.active_reading_plan()->>'done_today';
reset role;
\echo '== concluir um devocional que NÃO é o dia do plano: não avança'
select pg_temp.complete_content('Hoje basta a si mesmo');
select last_day_done from public.user_reading_plans;
\echo '== concluir o dia 1: avança para 1 e done_today'
select pg_temp.complete_content('Um convite para quem está cansado');
select last_day_done, last_day_done_on = (now() at time zone 'America/Sao_Paulo')::date as done_today from public.user_reading_plans;
\echo '== mesmo dia, concluir o dia 2: NÃO avança (um dia por dia)'
select pg_temp.complete_content('Descansar também é seguir o pastor');
select last_day_done from public.user_reading_plans;
\echo '== detalhe: day1 done, day2 next, resto locked; done_today true'
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select string_agg((i->>'day')||':'||(i->>'state'), ' ' order by (i->>'day')::int) from jsonb_array_elements(public.reading_plan_detail(:'pid'::uuid)->'items') i;
select public.reading_plan_detail(:'pid'::uuid)->>'done_today';
\echo '== trocar de plano pausa o anterior (progresso guardado)'
select public.start_reading_plan(:'pid2'::uuid);
select e->>'slug'||'='||(e->>'status')||'/'||(e->>'last_day_done') from jsonb_array_elements(public.list_reading_plans()) e where e->>'status' <> 'none' order by 1;
select public.start_reading_plan(:'pid'::uuid);
reset role;
\echo '== dias seguintes (simulando um dia por vez) até concluir o plano de 7 dias'
update public.user_reading_plans set last_day_done_on = (now() at time zone 'America/Sao_Paulo')::date - 1;
select pg_temp.complete_content('Descansar também é seguir o pastor');
update public.user_reading_plans set last_day_done_on = (now() at time zone 'America/Sao_Paulo')::date - 1;
select pg_temp.complete_content('Parar não é perder tempo');
update public.user_reading_plans set last_day_done_on = (now() at time zone 'America/Sao_Paulo')::date - 1;
select pg_temp.complete_content('Forças que voltam');
update public.user_reading_plans set last_day_done_on = (now() at time zone 'America/Sao_Paulo')::date - 1;
select pg_temp.complete_content('Presença antes de tarefas');
update public.user_reading_plans set last_day_done_on = (now() at time zone 'America/Sao_Paulo')::date - 1;
select pg_temp.complete_content('Tem tempo para tudo');
select last_day_done, active, completed_at is not null as completed from public.user_reading_plans where plan_id = :'pid'::uuid;
update public.user_reading_plans set last_day_done_on = (now() at time zone 'America/Sao_Paulo')::date - 1 where plan_id = :'pid'::uuid;
\echo '== último dia: conquista plan_completed e plano concluído (não ativo)'
select pg_temp.complete_content('Hoje basta a si mesmo');
select last_day_done, active, completed_at is not null as completed from public.user_reading_plans where plan_id = :'pid'::uuid;
select count(*) as plan_achievement_unlocked from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id where a.code='plan_completed';
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.active_reading_plan()->>'plan_id' = :'pid2'::text as outro_plano_nao_volta_sozinho;
select public.active_reading_plan() is null as sem_plano_ativo;
\echo '== recomeçar plano concluído zera o progresso'
select public.start_reading_plan(:'pid'::uuid);
select public.reading_plan_detail(:'pid'::uuid)->>'status', public.reading_plan_detail(:'pid'::uuid)->>'last_day_done';
\echo '== pausar'
select public.pause_reading_plan(:'pid'::uuid);
select public.active_reading_plan() is null as pausado;
