-- Lumi — limite diário de perguntas à IA e apagar reflexão.
--
--   1. ai_usage + consume_ai_quota: a edge function ask-about-devotional consome uma "pergunta" do
--      dia antes de chamar o modelo. Sem teto, uma conta (o cadastro é aberto) poderia gerar custo
--      ilimitado de API. O dia segue o fuso do perfil (set_user_timezone, migration 00013).
--   2. clear_session_reflection: o cliente não escreve mais em devotional_sessions (00013), então
--      "apagar minha reflexão" (briefing §15.6) passa por uma função que confere o dono.
--
-- Seguro de aplicar com o app antigo no ar: nada que o cliente já usa muda.

-- ---------------------------------------------------------------------------
-- 1) Limite diário de perguntas à IA
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

comment on table public.ai_usage is 'Perguntas feitas à IA por usuário e por dia (limite diário aplicado em consume_ai_quota).';

alter table public.ai_usage enable row level security;
-- Sem policies e sem privilégios: só a função abaixo (SECURITY DEFINER) lê e escreve.
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.consume_ai_quota(p_limit integer default 15)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'Limite inválido';
  end if;

  select coalesce(p.timezone, 'America/Sao_Paulo') into v_timezone
  from public.profiles p
  where p.id = v_user_id;

  begin
    v_today := (now() at time zone coalesce(v_timezone, 'America/Sao_Paulo'))::date;
  exception when others then
    v_today := (now() at time zone 'America/Sao_Paulo')::date;
  end;

  -- Incremento atômico: só conta se ainda está abaixo do limite (duas chamadas simultâneas não
  -- passam do teto). Sem linha retornada = limite do dia atingido.
  insert into public.ai_usage as u (user_id, day, count)
  values (v_user_id, v_today, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < p_limit
  returning u.count into v_count;

  if v_count is null then
    return query select false, 0;
  else
    return query select true, p_limit - v_count;
  end if;
end;
$$;

revoke execute on function public.consume_ai_quota(integer) from public;
revoke execute on function public.consume_ai_quota(integer) from anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Apagar a reflexão de um dia (o momento concluído continua valendo para a sequência)
-- ---------------------------------------------------------------------------
create or replace function public.clear_session_reflection(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  update public.devotional_sessions s
  set reflection_text = null
  where s.id = p_session_id
    and s.user_id = auth.uid();
end;
$$;

revoke execute on function public.clear_session_reflection(uuid) from public;
revoke execute on function public.clear_session_reflection(uuid) from anon;
grant execute on function public.clear_session_reflection(uuid) to authenticated;
