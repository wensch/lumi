\set ON_ERROR_STOP off
insert into auth.users (id) values ('33333333-3333-3333-3333-333333333333') on conflict do nothing;
update public.profiles set timezone='America/Sao_Paulo' where id='33333333-3333-3333-3333-333333333333';
create or replace function pg_temp.today() returns date language sql as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- helper: set streak state, open a session, complete it as the user
create or replace procedure pg_temp.scenario(p_label text, p_streak int, p_days_ago int, p_freezes int) language plpgsql as $$
declare v_sid uuid; r record;
begin
  update public.streaks set current_streak=p_streak, longest_streak=greatest(longest_streak,p_streak),
    last_completed_date = case when p_days_ago is null then null else pg_temp.today() - p_days_ago end,
    freezes=p_freezes where user_id='33333333-3333-3333-3333-333333333333';
  insert into public.devotional_sessions (user_id) values ('33333333-3333-3333-3333-333333333333') returning id into v_sid;
  perform set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',true);
  set local role authenticated;
  select * into r from public.complete_devotional_session(v_sid, null);
  reset role;
  raise notice '% -> streak=% xp=% used=% earned=% left=%', p_label, r.current_streak, r.xp_awarded, r.freeze_used, r.freeze_earned, r.freezes_left;
end $$;

call pg_temp.scenario('ontem, streak 3, sem folga (esperado 4)', 3, 1, 0);
call pg_temp.scenario('1 dia perdido, 1 folga (esperado 6, used)', 5, 2, 1);
call pg_temp.scenario('1 dia perdido, 0 folga (esperado 1)', 5, 2, 0);
call pg_temp.scenario('2 dias perdidos, 2 folgas (esperado 1)', 5, 3, 2);
call pg_temp.scenario('chega a 7 (esperado 7, earned, left 1)', 6, 1, 0);
call pg_temp.scenario('chega a 14 com 2 folgas (esperado 14, sem earned, left 2)', 13, 1, 2);
call pg_temp.scenario('usa folga e chega a 7 (esperado 7, used+earned, left 1)', 6, 2, 1);
call pg_temp.scenario('primeira vez (esperado 1)', 0, null, 0);
call pg_temp.scenario('ja concluiu hoje (esperado xp 0, streak 4)', 4, 0, 1);
