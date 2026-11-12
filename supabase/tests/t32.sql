\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
\set A '''aaaa0000-0000-0000-0000-000000000001'''
insert into auth.users (id) values (:A) on conflict do nothing;
insert into public.profiles (id, timezone, display_name) values (:A, 'America/Sao_Paulo', 'Ana') on conflict (id) do update set display_name = 'Ana';
truncate public.user_challenges, public.challenge_invites cascade;
delete from public.challenges where owner_id is not null;

set role authenticated; select set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001',false);
\echo '== nome com 101 caracteres por PATCH (esperado: violates check)'
update public.profiles set display_name = repeat('a', 101) where id = :A;
\echo '== nome com 100 e com emoji (esperado: UPDATE 1 duas vezes)'
update public.profiles set display_name = repeat('a', 100) where id = :A;
update public.profiles set display_name = 'Ana ✍️ 🙏' where id = :A;
\echo '== nome com U+2066 (esperado: invalid_input)'
update public.profiles set display_name = E'Ana⁦' where id = :A;
\echo '== desafio com título só de U+3164, U+2800 e U+2066 (esperado: invalid_input x3)'
select public.create_custom_challenge('personal', null, E'ㅤㅤㅤ', '', null, 'prayers', 2, 7);
select public.create_custom_challenge('personal', null, E'⠀⠀⠀', '', null, 'prayers', 2, 7);
select public.create_custom_challenge('personal', null, E'Meu⁦ desafio', '', null, 'prayers', 2, 7);
\echo '== desafio normal com emoji no título e acento (esperado: um uuid)'
select length(public.create_custom_challenge('personal', null, 'Oração ✍️ da manhã', 'Orar 2 vezes', '🙏', 'prayers', 2, 7)::text);
\echo '== plano e círculo com U+2067 (esperado: invalid_input x2)'
select public.create_custom_plan(E'Plano⁧', '', null, null, '[{"title":"x"},{"title":"y"},{"title":"z"}]'::jsonb);
select public.create_circle(E'Círculo⁧');
\echo '== círculo normal (esperado: um objeto com código)'
select (public.create_circle('Círculo da Ana'))->>'invite_code' is not null;
reset role;
