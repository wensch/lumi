-- Lumi — schema inicial
-- Ver docs/lumi-briefing.md §15.5 (dados essenciais) e §15.6 (segurança/privacidade).
--
-- Princípios aplicados aqui:
--   - XP e streak medem constância comportamental, nunca espiritualidade (§7.1).
--   - prayer_entries é conteúdo sensível: RLS estrita, só o dono acessa.
--   - content e bible_sources são catálogo editorial: leitura pública, escrita só via service role.
--   - Todo dado pessoal é dono-apagável (delete cascade a partir de auth.users).

create extension if not exists "pgcrypto";

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  age_range text check (age_range in ('kid', 'teen', 'adult', 'senior')),
  preferred_time time,
  timezone text default 'America/Sao_Paulo',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados de perfil e preferências de personalização do usuário.';

-- =========================================================================
-- streaks
-- =========================================================================
create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completed_date date,
  grace_available boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.streaks is 'Sequência de constância. Quebrar streak nunca é falha moral — sempre há rota de retorno (§7.2).';

-- =========================================================================
-- bible_sources — metadados de versões bíblicas (YouVersion etc.)
-- =========================================================================
create table public.bible_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'youversion',
  version_code text not null,
  version_name text not null,
  language text not null,
  license_status text not null default 'pending' check (
    license_status in ('pending', 'approved', 'revoked')
  ),
  created_at timestamptz not null default now(),
  unique (provider, version_code)
);

comment on table public.bible_sources is 'Metadados de versões bíblicas licenciadas. Nada é exibido antes de license_status = approved (§10.1, §15.3).';

-- =========================================================================
-- content — devocionais/conteúdo editorial aprovado
-- =========================================================================
create table public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  passage_reference text,
  bible_source_id uuid references public.bible_sources (id),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.content is 'Conteúdo devocional editorial aprovado (curto, orientado a constância — não curso teológico, §10).';

-- =========================================================================
-- devotional_sessions
-- =========================================================================
create table public.devotional_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_id uuid references public.content (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  reflection_text text,
  created_at timestamptz not null default now()
);

comment on table public.devotional_sessions is 'Cada momento diário (leitura + reflexão) que o usuário inicia/conclui.';

create index devotional_sessions_user_id_idx on public.devotional_sessions (user_id, started_at desc);

-- =========================================================================
-- xp_events
-- =========================================================================
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null check (
    reason in ('daily_moment', 'reflection', 'prayer_logged', 'achievement', 'streak_milestone')
  ),
  devotional_session_id uuid references public.devotional_sessions (id),
  created_at timestamptz not null default now()
);

comment on table public.xp_events is 'Log append-only de XP. XP mede constância, nunca espiritualidade (§7.1) — nunca editar eventos existentes.';

create index xp_events_user_id_idx on public.xp_events (user_id, created_at desc);

-- =========================================================================
-- achievements (catálogo) + user_achievements (desbloqueios)
-- =========================================================================
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.achievements is 'Catálogo de conquistas (ex: primeiro momento, 7 dias, 30 dias). Editorial, gerenciado via service role.';

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

comment on table public.user_achievements is 'Conquistas desbloqueadas por usuário.';

-- =========================================================================
-- prayer_entries — conteúdo sensível (§15.6)
-- =========================================================================
create table public.prayer_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  devotional_session_id uuid references public.devotional_sessions (id),
  source text not null check (source in ('user_written', 'ai_generated')),
  body text not null,
  based_on_passage text,
  created_at timestamptz not null default now()
);

comment on table public.prayer_entries is 'Orações do usuário — conteúdo extremamente pessoal. Nunca usar para treinar modelos sem consentimento explícito (§15.6).';

create index prayer_entries_user_id_idx on public.prayer_entries (user_id, created_at desc);

-- =========================================================================
-- lumi_state — estado do personagem por usuário
-- =========================================================================
create table public.lumi_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mood text not null default 'normal' check (
    mood in (
      'normal', 'happy', 'celebrating', 'sassy', 'suspicious', 'waiting',
      'missing_you', 'surprised', 'thoughtful', 'sleepy', 'determined',
      'proud', 'sad'
    )
  ),
  equipped_cosmetic_id uuid,
  updated_at timestamptz not null default now()
);

comment on table public.lumi_state is 'Estado atual do Lumi por usuário (§8.6). Evolução reflete constância, não "nível espiritual" (§8.7).';

-- =========================================================================
-- notification_preferences
-- =========================================================================
create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reminders_enabled boolean not null default true,
  preferred_time time,
  intensity text not null default 'normal' check (intensity in ('low', 'normal', 'high')),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is 'Preferências de lembrete por usuário (§14).';
