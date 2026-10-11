\set ON_ERROR_STOP off
insert into auth.users (id) values ('44444444-4444-4444-4444-444444444444'),('55555555-5555-5555-5555-555555555555') on conflict do nothing;
insert into public.profiles (id, timezone) values ('44444444-4444-4444-4444-444444444444','America/Sao_Paulo') on conflict (id) do nothing;
insert into public.streaks (user_id) values ('44444444-4444-4444-4444-444444444444') on conflict do nothing;
create or replace function pg_temp.today() returns date language sql as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create or replace procedure pg_temp.sc(p_label text, p_streak int, p_days_ago int, p_old_sessions int, p_reflection text, p_expect text)
language plpgsql as $$
declare v_uid uuid := '44444444-4444-4444-4444-444444444444'; v_sid uuid; r record;
begin
  delete from public.user_achievements where user_id=v_uid;
  delete from public.xp_events where user_id=v_uid;
  delete from public.devotional_sessions where user_id=v_uid;
  insert into public.devotional_sessions (user_id, started_at, completed_at) select v_uid, now() - (g || ' days')::interval - interval '30 days', now() - (g || ' days')::interval - interval '30 days' from generate_series(1, p_old_sessions) g;
  update public.streaks set current_streak=p_streak, last_completed_date = case when p_days_ago is null then null else pg_temp.today()-p_days_ago end, freezes=0 where user_id=v_uid;
  insert into public.devotional_sessions (user_id) values (v_uid) returning id into v_sid;
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  set local role authenticated;
  select * into r from public.complete_devotional_session(v_sid, p_reflection);
  reset role;
  raise notice '% -> % | esperado: %', p_label, (select string_agg(c, ',' order by c) from unnest(r.unlocked_achievement_codes) c), p_expect;
end $$;

call pg_temp.sc('primeira vez', 0, null, 0, null, 'first_moment');
call pg_temp.sc('streak 2->3', 2, 1, 1, null, 'first_moment,streak_3_days');
call pg_temp.sc('streak 6->7 (3 e 7)', 6, 1, 6, null, 'first_moment,streak_3_days,streak_7_days');
call pg_temp.sc('streak 13->14, 14 momentos', 13, 1, 14, null, 'first_moment,moments_10,streak_14_days,streak_3_days,streak_7_days');
call pg_temp.sc('com reflexão', 0, null, 0, 'oi', 'first_moment,first_reflection');
call pg_temp.sc('reflexão só espaços', 0, null, 0, '   ', 'first_moment');
call pg_temp.sc('volta após 5 dias (sumiu 4 dias inteiros)', 9, 5, 3, null, 'first_moment,comeback');
call pg_temp.sc('volta após 2 dias (1 dia inteiro)', 9, 2, 3, null, 'first_moment');
call pg_temp.sc('49 momentos -> 50', 0, 1, 49, null, 'first_moment,moments_10,moments_50');

-- círculo e torcida
insert into public.circles (id, name, invite_code, owner_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','T','ZZZZ1111','55555555-5555-5555-5555-555555555555') on conflict do nothing;
insert into public.circle_members (circle_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','55555555-5555-5555-5555-555555555555','owner'),('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','44444444-4444-4444-4444-444444444444','member') on conflict do nothing;
call pg_temp.sc('é de um círculo', 0, null, 0, null, 'first_moment,first_circle');
insert into public.circle_cheers (circle_id, from_user, to_user, day) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555', current_date);
call pg_temp.sc('já torceu', 0, null, 0, null, 'first_circle,first_cheer,first_moment');
-- idempotência: segunda conclusão no mesmo dia não dá nada novo
do $$ declare v uuid := '44444444-4444-4444-4444-444444444444'; sid uuid; r record; begin
  insert into public.devotional_sessions (user_id) values (v) returning id into sid;
  perform set_config('request.jwt.claim.sub', v::text, true); set local role authenticated;
  select * into r from public.complete_devotional_session(sid, null); reset role;
  raise notice 'segunda no mesmo dia -> xp=% codes=%', r.xp_awarded, r.unlocked_achievement_codes;
end $$;
select count(*) as xp_events_achievement from public.xp_events where user_id='44444444-4444-4444-4444-444444444444' and reason='achievement';
