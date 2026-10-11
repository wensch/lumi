-- Lumi — pente fino (11/10/2026): desempenho do banco, sem mudar nenhum comportamento.
--
--   1. As políticas de RLS chamavam auth.uid() direto: o Postgres reavalia a função a cada linha.
--      Com (select auth.uid()) ela é avaliada uma vez por consulta (alerta auth_rls_initplan).
--      Usa ALTER POLICY (mesma regra, só a forma de escrever), então não precisa recriar nada.
--   2. Índices para chaves estrangeiras sem índice: acelera apagar usuário/círculo/pedido (cascata)
--      e os filtros das funções (alerta unindexed_foreign_keys).

-- ---------------------------------------------------------------------------
-- 1) Políticas de RLS
-- ---------------------------------------------------------------------------
alter policy devotional_sessions_select_own on public.devotional_sessions
  using ((select auth.uid()) = user_id);
alter policy devotional_sessions_insert_own on public.devotional_sessions
  with check ((select auth.uid()) = user_id);
alter policy devotional_sessions_delete_own on public.devotional_sessions
  using ((select auth.uid()) = user_id);

alter policy lumi_state_select_own on public.lumi_state
  using ((select auth.uid()) = user_id);
alter policy lumi_state_insert_own on public.lumi_state
  with check ((select auth.uid()) = user_id);
alter policy lumi_state_update_own on public.lumi_state
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy notification_preferences_select_own on public.notification_preferences
  using ((select auth.uid()) = user_id);
alter policy notification_preferences_insert_own on public.notification_preferences
  with check ((select auth.uid()) = user_id);
alter policy notification_preferences_update_own on public.notification_preferences
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy prayer_entries_select_own on public.prayer_entries
  using ((select auth.uid()) = user_id);
alter policy prayer_entries_insert_own on public.prayer_entries
  with check ((select auth.uid()) = user_id);
alter policy prayer_entries_update_own on public.prayer_entries
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy prayer_entries_delete_own on public.prayer_entries
  using ((select auth.uid()) = user_id);

alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);
alter policy profiles_insert_own on public.profiles
  with check ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy profiles_delete_own on public.profiles
  using ((select auth.uid()) = id);

alter policy streaks_select_own on public.streaks
  using ((select auth.uid()) = user_id);
alter policy user_achievements_select_own on public.user_achievements
  using ((select auth.uid()) = user_id);
alter policy xp_events_select_own on public.xp_events
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 2) Índices de chaves estrangeiras
-- ---------------------------------------------------------------------------
create index if not exists circle_challenges_challenge_idx on public.circle_challenges (challenge_id);
create index if not exists circle_challenges_started_by_idx on public.circle_challenges (started_by);
create index if not exists circle_cheers_from_user_idx on public.circle_cheers (from_user, day);
create index if not exists circle_cheers_to_user_idx on public.circle_cheers (to_user);
create index if not exists circle_events_circle_idx on public.circle_events (circle_id);
create index if not exists circle_events_request_idx on public.circle_events (request_id);
create index if not exists circle_reports_reporter_idx on public.circle_reports (reporter_id);
create index if not exists circles_owner_idx on public.circles (owner_id);
create index if not exists content_bible_source_idx on public.content (bible_source_id);
create index if not exists devotional_sessions_content_idx on public.devotional_sessions (content_id);
create index if not exists prayer_entries_session_idx on public.prayer_entries (devotional_session_id);
create index if not exists prayer_prayers_user_idx on public.prayer_prayers (user_id, created_at);
create index if not exists prayer_requests_author_idx on public.prayer_requests (author_id, created_at desc);
create index if not exists reading_plan_days_content_idx on public.reading_plan_days (content_id);
create index if not exists user_achievements_achievement_idx on public.user_achievements (achievement_id);
create index if not exists user_challenges_challenge_idx on public.user_challenges (challenge_id);
create index if not exists user_reading_plans_plan_idx on public.user_reading_plans (plan_id);

-- Contagens feitas a cada conclusão de momento (conquistas e desafios) por dia concluído.
create index if not exists devotional_sessions_completed_idx
  on public.devotional_sessions (user_id, completed_at) where completed_at is not null;
create index if not exists circle_challenges_circle_idx
  on public.circle_challenges (circle_id, started_at desc);
