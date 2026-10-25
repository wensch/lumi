\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
insert into auth.users (id) values (:A) on conflict do nothing;
insert into public.profiles (id, timezone) values (:A, 'America/Sao_Paulo') on conflict (id) do nothing;
-- Traduz 3 devocionais publicados e 1 plano e 1 desafio do catálogo (IDs locais).
delete from public.content_translations;
insert into public.content_translations (content_id, language, title, body)
  select id, 'en', 'T', 'B' from public.content where published_at is not null and owner_id is null and seasonal = false order by id limit 3;
insert into public.reading_plan_translations (plan_id, language, title, description)
  select id, 'en', 'P', 'D' from public.reading_plans where owner_id is null order by id limit 1;

\echo '== anônimo lê as 3 traduções publicadas (esperado: 3)'
set role anon;
select count(*) from public.content_translations;
reset role;

\echo '== anônimo não vê tradução de conteúdo privado de plano próprio (esperado: 0)'
insert into public.content (title, body, owner_id) values ('Privado', 'x', :A);
insert into public.content_translations (content_id, language, title, body)
  select id, 'en', 'Private', 'y' from public.content where owner_id = :A;
set role anon;
select 'privadas visiveis: ' || count(*) from public.content_translations t
  join public.content c on c.id = t.content_id where c.owner_id is not null;
reset role;

\echo '== anônimo não grava tradução (esperado: erro de RLS ou permissão)'
set role anon;
insert into public.content_translations (content_id, language, title, body)
  select id, 'en', 'x', 'y' from public.content limit 1;
reset role;

\echo '== plano devolve content_id em cada dia (esperado: true)'
select id as plano from public.reading_plans where owner_id is null order by id limit 1 \gset
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
select (public.reading_plan_detail(:'plano'::uuid)->'items'->0) ? 'content_id';
reset role;
