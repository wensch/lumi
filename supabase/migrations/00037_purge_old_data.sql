-- Lumi — limpeza de dados antigos (achado T-006 do loop de agentes; política de privacidade §4).
--
-- Prazos: erros 60 dias; tentativas de código de convite 1 dia; eventos de uso 365 dias; avisos de círculo 90 dias;
-- tokens de aviso inativos há 30 dias (ou sem uso há 180); contagem de perguntas à IA 7 dias; desafios abandonados ou
-- expirados 180 dias (os concluídos ficam); denúncias 12 meses. Função interna, só o agendador (pg_cron) e o dono do
-- banco executam. Agendada todo dia às 03:17 UTC.

create or replace function public.purge_old_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n_events bigint; n_errors bigint; n_attempts bigint; n_cevents bigint;
  n_tokens bigint; n_ai bigint; n_uch bigint; n_reports bigint;
begin
  delete from public.app_errors where created_at < now() - interval '60 days';
  get diagnostics n_errors = row_count;
  delete from public.circle_join_attempts where attempted_at < now() - interval '1 day';
  get diagnostics n_attempts = row_count;
  delete from public.app_events where day < current_date - 365;
  get diagnostics n_events = row_count;
  delete from public.circle_events where created_at < now() - interval '90 days';
  get diagnostics n_cevents = row_count;
  delete from public.device_tokens
    where (not active and updated_at < now() - interval '30 days') or updated_at < now() - interval '180 days';
  get diagnostics n_tokens = row_count;
  delete from public.ai_usage where day < current_date - 7;
  get diagnostics n_ai = row_count;
  delete from public.user_challenges
    where status in ('abandoned', 'expired') and coalesce(completed_at, ends_at) < now() - interval '180 days';
  get diagnostics n_uch = row_count;
  delete from public.circle_reports where created_at < now() - interval '12 months';
  get diagnostics n_reports = row_count;

  return jsonb_build_object(
    'app_errors', n_errors, 'join_attempts', n_attempts, 'app_events', n_events,
    'circle_events', n_cevents, 'device_tokens', n_tokens, 'ai_usage', n_ai,
    'user_challenges', n_uch, 'circle_reports', n_reports
  );
end;
$$;

revoke execute on function public.purge_old_data() from public, anon, authenticated;

-- Agenda a limpeza todo dia às 03:17 UTC quando a extensão pg_cron existe (no Supabase existe; no Postgres local dos
-- testes não, e então só a função fica criada).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'lumi-purge-old-data';
    perform cron.schedule('lumi-purge-old-data', '17 3 * * *', 'select public.purge_old_data()');
  end if;
end;
$$;
