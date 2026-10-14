\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
\set B '''bbbb0000-0000-0000-0000-000000000002'''
insert into auth.users (id) values (:A),(:B) on conflict do nothing;
insert into public.profiles (id, timezone) select id, 'America/Sao_Paulo' from auth.users where id in (:A,:B) on conflict (id) do nothing;
truncate public.user_reading_plans, public.devotional_sessions cascade;
delete from public.reading_plan_days where plan_id in (select id from public.reading_plans where owner_id is not null);
delete from public.reading_plans where owner_id is not null;
delete from public.content where owner_id is not null;
select 'plano padrão (de planos editoriais): ' || count(*) from public.reading_plans where owner_id is null;

set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
\echo '== A cria um plano de livro (João 1-5) e já começa (esperado: uuid)'
select public.create_custom_plan('João em 5 dias', 'Um capítulo por dia', '📖', null,
  '[{"title":"João 1","passage_reference":"JHN.1","body":""},{"title":"João 2","passage_reference":"JHN.2","body":""},{"title":"João 3","passage_reference":"JHN.3","body":""},{"title":"João 4","passage_reference":"JHN.4","body":""},{"title":"João 5","passage_reference":"JHN.5","body":""}]'::jsonb) is not null;
select 'planos de A: ' || jsonb_array_length(public.list_reading_plans()) || ', custom: ' || (select count(*) from jsonb_array_elements(public.list_reading_plans()) e where (e->>'custom')::boolean);
select 'ativo: ' || (public.active_reading_plan()->>'title') || ' dia ' || (public.active_reading_plan()->>'next_day');
select 'A lê o conteúdo do dia 1 (esperado 1): ' || count(*) from public.content where id = (public.active_reading_plan()->>'content_id')::uuid;
\echo '== B não vê o plano de A nem o conteúdo (esperado: 0 custom, 0 conteúdo)'
select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
select 'custom p/ B: ' || (select count(*) from jsonb_array_elements(public.list_reading_plans()) e where (e->>'custom')::boolean);
select 'conteúdo custom visível p/ B: ' || count(*) from public.content where owner_id is not null;
reset role;
select id as pid from public.reading_plans where owner_id = :A limit 1 \gset
set role authenticated; select set_config('request.jwt.claim.sub','bbbb0000-0000-0000-0000-000000000002',false);
\echo '== B tenta abrir/iniciar/arquivar o plano de A (esperado: not_found, not_found, forbidden)'
select public.reading_plan_detail(:'pid'::uuid);
select public.start_reading_plan(:'pid'::uuid);
select public.archive_custom_plan(:'pid'::uuid);
\echo '== validações (esperado: invalid_input em todas)'
select public.create_custom_plan('ab', '', null, null, '[{"title":"x"},{"title":"y"},{"title":"z"}]'::jsonb);
select public.create_custom_plan('Plano ok', '', null, null, '[{"title":"x"},{"title":"y"}]'::jsonb);
select public.create_custom_plan('Plano ok', '', null, 'https://evil.example.com/x', '[{"title":"x"},{"title":"y"},{"title":"z"}]'::jsonb);
select public.create_custom_plan('Plano ok', '', null, 'https://www.bible.com.evil.com/x', '[{"title":"x"},{"title":"y"},{"title":"z"}]'::jsonb);
select public.create_custom_plan('Plano ok', '', null, null, '[{"title":"x","passage_reference":"nada"},{"title":"y"},{"title":"z"}]'::jsonb);
select public.create_custom_plan('Plano ok', '', null, null, '{"a":1}'::jsonb);
\echo '== plano do YouVersion com link válido (esperado: uuid) e sem passagem'
select public.create_custom_plan('Plano da YouVersion', '14 dias', '🧭', 'https://www.bible.com/reading-plans/1234-x', 
  (select jsonb_agg(jsonb_build_object('title','Dia '||n,'body','Leia no app','passage_reference',null)) from generate_series(1,14) n)) is not null;
\echo '== A: progresso. Conclui o dia 1 do plano (esperado: dia seguinte = 2)'
select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
insert into public.devotional_sessions (user_id, content_id) values (:A, (public.active_reading_plan()->>'content_id')::uuid) returning id as sid \gset
select count(*) from public.complete_devotional_session(:'sid'::uuid, 'ok');
select 'última: ' || (public.reading_plan_detail(:'pid'::uuid)->>'last_day_done') || ' / ' || (public.reading_plan_detail(:'pid'::uuid)->>'days');
\echo '== arquivar (esperado: some da lista e não há plano ativo)'
select public.archive_custom_plan(:'pid'::uuid);
select 'planos de A: ' || (select count(*) from jsonb_array_elements(public.list_reading_plans()) e where (e->>'custom')::boolean);
select 'ativo: ' || coalesce(public.active_reading_plan()::text, 'nenhum');
\echo '== limite de 10 planos (esperado: too_many_created no 6º criado no dia)'
select public.create_custom_plan('Plano '||n, '', null, null, '[{"title":"x"},{"title":"y"},{"title":"z"}]'::jsonb, false) is not null from generate_series(1,5) n;
reset role;
\echo '== o conteúdo privado não entra na lista pública de planos editoriais (esperado: 0)'
select count(*) from public.content where owner_id is not null and published_at is not null;
