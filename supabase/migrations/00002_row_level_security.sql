-- Lumi — Row Level Security
-- Regra geral: dono só vê/edita o próprio dado (auth.uid() = user_id).
-- Catálogo editorial (content, bible_sources, achievements) é leitura pública,
-- escrita reservada à service role (sem policy de insert/update/delete para authenticated).

-- =========================================================================
-- profiles
-- =========================================================================
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- =========================================================================
-- streaks
-- =========================================================================
alter table public.streaks enable row level security;

create policy "streaks_select_own" on public.streaks
  for select using (auth.uid() = user_id);

create policy "streaks_insert_own" on public.streaks
  for insert with check (auth.uid() = user_id);

create policy "streaks_update_own" on public.streaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- devotional_sessions
-- =========================================================================
alter table public.devotional_sessions enable row level security;

create policy "devotional_sessions_select_own" on public.devotional_sessions
  for select using (auth.uid() = user_id);

create policy "devotional_sessions_insert_own" on public.devotional_sessions
  for insert with check (auth.uid() = user_id);

create policy "devotional_sessions_update_own" on public.devotional_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "devotional_sessions_delete_own" on public.devotional_sessions
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- xp_events (append-only: sem policy de update/delete para authenticated)
-- =========================================================================
alter table public.xp_events enable row level security;

create policy "xp_events_select_own" on public.xp_events
  for select using (auth.uid() = user_id);

create policy "xp_events_insert_own" on public.xp_events
  for insert with check (auth.uid() = user_id);

-- =========================================================================
-- achievements — catálogo público, leitura para qualquer usuário autenticado
-- =========================================================================
alter table public.achievements enable row level security;

create policy "achievements_select_all" on public.achievements
  for select using (true);

-- =========================================================================
-- user_achievements
-- =========================================================================
alter table public.user_achievements enable row level security;

create policy "user_achievements_select_own" on public.user_achievements
  for select using (auth.uid() = user_id);

create policy "user_achievements_insert_own" on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- =========================================================================
-- prayer_entries — conteúdo sensível, dono exclusivo (§15.6)
-- =========================================================================
alter table public.prayer_entries enable row level security;

create policy "prayer_entries_select_own" on public.prayer_entries
  for select using (auth.uid() = user_id);

create policy "prayer_entries_insert_own" on public.prayer_entries
  for insert with check (auth.uid() = user_id);

create policy "prayer_entries_update_own" on public.prayer_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prayer_entries_delete_own" on public.prayer_entries
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- content — catálogo editorial público, só leitura de publicados
-- =========================================================================
alter table public.content enable row level security;

create policy "content_select_published" on public.content
  for select using (published_at is not null and published_at <= now());

-- =========================================================================
-- bible_sources — catálogo público, só leitura de fontes aprovadas
-- =========================================================================
alter table public.bible_sources enable row level security;

create policy "bible_sources_select_approved" on public.bible_sources
  for select using (license_status = 'approved');

-- =========================================================================
-- lumi_state
-- =========================================================================
alter table public.lumi_state enable row level security;

create policy "lumi_state_select_own" on public.lumi_state
  for select using (auth.uid() = user_id);

create policy "lumi_state_insert_own" on public.lumi_state
  for insert with check (auth.uid() = user_id);

create policy "lumi_state_update_own" on public.lumi_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- notification_preferences
-- =========================================================================
alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

create policy "notification_preferences_insert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
