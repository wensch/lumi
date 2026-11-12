\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\echo '== ANTES: anon lê as traduções de plano e de desafio (esperado depois da migration: números, não permission denied)'
reset role;
insert into public.reading_plan_translations (plan_id, language, title, description)
  select id, 'en', 'T', 'D' from public.reading_plans where owner_id is null and published_at is not null limit 1 on conflict do nothing;
insert into public.challenge_translations (challenge_id, language, title, description)
  select id, 'en', 'T', 'D' from public.challenges where owner_id is null and circle_id is null and published_at is not null limit 1 on conflict do nothing;
set role anon;
select count(*) >= 1 from public.reading_plan_translations;
select count(*) >= 1 from public.challenge_translations;
set role authenticated;
select count(*) >= 1 from public.reading_plan_translations;
select count(*) >= 1 from public.challenge_translations;
\echo '== anon continua sem ler as tabelas-base (esperado: permission denied x2)'
set role anon;
select count(*) from public.reading_plans;
select count(*) from public.challenges;
\echo '== tradução de plano de outra pessoa/arquivado não aparece (esperado: 0)'
reset role;
update public.reading_plans set archived_at = now() where id in (select plan_id from public.reading_plan_translations);
set role anon;
select count(*) from public.reading_plan_translations;
reset role;
update public.reading_plans set archived_at = null;
