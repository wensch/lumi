-- Lumi — métricas de uso e relatório de erros (Bloco D).
--
-- Métricas: só contagens por dia e por pessoa, de uma lista fechada de eventos. Nunca texto, nunca reflexão
-- nem pedido de oração. Quem conta é o próprio banco: não há ferramenta de terceiros.
-- Erros: relatório anônimo (sem user_id), com texto cortado e limpo de aspas, e-mails e links; limite
-- global por hora para ninguém encher a tabela.
--
-- Tabelas fechadas ao cliente; tudo por função. Sem DROP nem DELETE.

-- ---------------------------------------------------------------------------
-- Métricas
-- ---------------------------------------------------------------------------
create table if not exists public.app_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name in (
    'app_open', 'devotional_started', 'devotional_completed', 'plan_started',
    'challenge_started', 'circle_joined', 'notification_opened'
  )),
  day date not null,
  primary key (user_id, name, day)
);

create index if not exists app_events_day_idx on public.app_events (day);

alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;

-- Registra o evento do dia (uma vez por dia e por evento). Silencioso: nunca quebra o app.
create or replace function public.track_event(p_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then return; end if;
  if p_name is null or p_name not in (
    'app_open', 'devotional_started', 'devotional_completed', 'plan_started',
    'challenge_started', 'circle_joined', 'notification_opened'
  ) then
    raise exception 'invalid_input';
  end if;

  insert into public.app_events (user_id, name, day)
  values (v_user_id, p_name, public.user_local_date(v_user_id))
  on conflict do nothing;
end;
$$;

-- Coorte: quem criou a conta no período (dia em UTC; a diferença de poucas horas não muda a leitura).
create or replace function public.metrics_cohort(p_from date, p_to date)
returns table (id uuid, signup_day date)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, (p.created_at at time zone 'UTC')::date
  from public.profiles p
  where (p.created_at at time zone 'UTC')::date between p_from and p_to;
$$;

-- Resumo para acompanhar o produto. Não é exposto ao app: roda no SQL Editor do Supabase (papel postgres).
create or replace function public.metrics_summary(
  p_from date default (current_date - 30),
  p_to date default current_date
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'periodo', jsonb_build_object('de', p_from, 'ate', p_to),
    'cadastros', (select count(*) from public.metrics_cohort(p_from, p_to)),
    -- Ativação: primeiro momento concluído até o dia seguinte ao cadastro.
    'ativacao', (
      select jsonb_build_object(
        'quantos', count(*) filter (where exists (
          select 1 from public.app_events e
          where e.user_id = c.id and e.name = 'devotional_completed'
            and e.day between c.signup_day and c.signup_day + 1
        )),
        'taxa', round(
          (count(*) filter (where exists (
            select 1 from public.app_events e
            where e.user_id = c.id and e.name = 'devotional_completed'
              and e.day between c.signup_day and c.signup_day + 1
          )))::numeric / nullif(count(*), 0), 3)
      )
      from public.metrics_cohort(p_from, p_to) c
    ),
    -- Retenção: voltou a usar o app exatamente N dias depois do cadastro. Só conta quem já teve esse prazo.
    'retencao', (
      select coalesce(jsonb_object_agg('d' || n, jsonb_build_object(
        'maduros', matured,
        'voltaram', back,
        'taxa', round(back::numeric / nullif(matured, 0), 3)
      )), '{}'::jsonb)
      from (values (1), (7), (30)) as horizons(n)
      cross join lateral (
        select
          count(*) filter (where c.signup_day + n <= current_date) as matured,
          count(*) filter (where c.signup_day + n <= current_date and exists (
            select 1 from public.app_events e
            where e.user_id = c.id and e.day = c.signup_day + n
          )) as back
        from public.metrics_cohort(p_from, p_to) c
      ) r
    ),
    -- Constância: média de dias com momento concluído, por pessoa que concluiu algum no período.
    'constancia_media_dias', (
      select round(avg(dias)::numeric, 2) from (
        select count(distinct e.day) as dias
        from public.app_events e
        where e.name = 'devotional_completed' and e.day between p_from and p_to
        group by e.user_id
      ) x
    ),
    -- Conclusão: sessões iniciadas que chegaram ao fim (a partir de devotional_sessions, sem texto).
    'conclusao', (
      select jsonb_build_object(
        'iniciadas', count(*),
        'concluidas', count(*) filter (where s.completed_at is not null),
        'taxa', round((count(*) filter (where s.completed_at is not null))::numeric / nullif(count(*), 0), 3)
      )
      from public.devotional_sessions s
      where (s.started_at at time zone 'UTC')::date between p_from and p_to
    ),
    -- Notificações: aberturas a partir do aviso. Avisos enviados ainda não são contados (ver docs/metricas.md).
    'notificacoes_abertas', (
      select count(*) from public.app_events e
      where e.name = 'notification_opened' and e.day between p_from and p_to
    )
  );
$$;

revoke execute on function public.track_event(text) from public, anon;
revoke execute on function public.metrics_cohort(date, date) from public, anon, authenticated;
revoke execute on function public.metrics_summary(date, date) from public, anon, authenticated;
grant execute on function public.track_event(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Relatório de erros (anônimo)
-- ---------------------------------------------------------------------------
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (char_length(source) <= 40),
  message text not null check (char_length(message) <= 300),
  stack text check (char_length(stack) <= 1500),
  app_version text check (char_length(app_version) <= 20),
  platform text check (char_length(platform) <= 10)
);

create index if not exists app_errors_created_idx on public.app_errors (created_at);

alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;

-- Tira o que pode ser dado pessoal: texto entre aspas (ex.: o que a pessoa digitou), e-mails e links.
create or replace function public.scrub_error_text(p_text text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p_text, ''), '"[^"]*"', '"…"', 'g'),
        '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'
      ),
      'https?://\S+', '[link]', 'g'
    ),
    1500
  );
$$;

-- Qualquer pessoa (inclusive sem login) pode relatar um erro. Nunca falha para quem relata.
create or replace function public.report_app_error(
  p_source text,
  p_message text,
  p_stack text default null,
  p_app_version text default null,
  p_platform text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Teto global por hora: um laço de erro não enche a tabela.
  if (select count(*) from public.app_errors where created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;

  insert into public.app_errors (source, message, stack, app_version, platform)
  values (
    left(coalesce(nullif(trim(p_source), ''), 'desconhecido'), 40),
    left(public.scrub_error_text(p_message), 300),
    nullif(public.scrub_error_text(p_stack), ''),
    left(p_app_version, 20),
    left(p_platform, 10)
  );
end;
$$;

revoke execute on function public.scrub_error_text(text) from public, anon, authenticated;
revoke execute on function public.report_app_error(text, text, text, text, text) from public;
grant execute on function public.report_app_error(text, text, text, text, text) to anon, authenticated;
