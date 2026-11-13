\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
insert into auth.users (id) values (:A) on conflict do nothing;
insert into public.profiles (id, timezone, display_name) values (:A, 'America/Sao_Paulo', 'Ana') on conflict (id) do nothing;
insert into public.notification_preferences (user_id) values (:A) on conflict do nothing;
delete from public.parental_consents where user_id = :A;
set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
\echo '== criança sem consentimento (esperado: parental_consent_required)'
select public.complete_onboarding('Ana', 'kid', '08:00');
\echo '== consentimento inválido: nome curto, e-mail sem @ (esperado: invalid_input x2)'
select public.record_parental_consent('A', 'mae@exemplo.com', 'v1');
select public.record_parental_consent('Maria Souza', 'sem-arroba', 'v1');
\echo '== nome com caractere invisível (esperado: invalid_input)'
select public.record_parental_consent(E'Maria⁦ Souza', 'mae@exemplo.com', 'v1');
\echo '== consentimento válido e depois a criança conclui (esperado: sem erro; kid)'
select public.record_parental_consent('Maria Souza', 'mae@exemplo.com', 'v1');
select public.complete_onboarding('Ana', 'kid', '08:00');
select age_range from public.profiles where id = :A;
\echo '== adulto não exige consentimento (esperado: sem erro; adult)'
select public.complete_onboarding('Ana', 'adult', '08:00');
select age_range from public.profiles where id = :A;
\echo '== ninguém lê a tabela direto (esperado: permission denied)'
select count(*) from public.parental_consents;
reset role;
set role anon;
select public.record_parental_consent('Maria Souza', 'mae@exemplo.com', 'v1');
reset role;
