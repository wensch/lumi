-- Lumi — traduções do conteúdo do banco (Bloco D: inglês completo).
--
-- O conteúdo editorial (devocionais, planos, desafios) é escrito em português. Estas tabelas guardam a versão
-- em inglês, uma linha por item e idioma. O app lê a tradução quando o idioma é inglês e cai no português
-- quando não há tradução. Só vale para conteúdo publicado e editorial (planos e dias de planos próprios
-- ficam fora: são da pessoa).
--
-- Leitura pública (catálogo), escrita só pelo SQL Editor. Sem DROP nem DELETE.

create table if not exists public.content_translations (
  content_id uuid not null references public.content (id) on delete cascade,
  language text not null check (language in ('en')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null,
  application_text text,
  challenge_text text,
  prayer_text text,
  primary key (content_id, language)
);

create table if not exists public.reading_plan_translations (
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  language text not null check (language in ('en')),
  title text not null check (char_length(title) between 1 and 200),
  description text not null,
  primary key (plan_id, language)
);

create table if not exists public.challenge_translations (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  language text not null check (language in ('en')),
  title text not null check (char_length(title) between 1 and 200),
  description text not null,
  primary key (challenge_id, language)
);

alter table public.content_translations enable row level security;
alter table public.reading_plan_translations enable row level security;
alter table public.challenge_translations enable row level security;

-- Só o que está publicado e é editorial (não dia de plano próprio).
create policy "content_translations_select_published" on public.content_translations
  for select to anon, authenticated
  using (exists (
    select 1 from public.content c
    where c.id = content_id and c.owner_id is null
      and c.published_at is not null and c.published_at <= now()
  ));

create policy "reading_plan_translations_select_published" on public.reading_plan_translations
  for select to anon, authenticated
  using (exists (
    select 1 from public.reading_plans p
    where p.id = plan_id and p.owner_id is null and p.archived_at is null
      and p.published_at is not null
  ));

create policy "challenge_translations_select_published" on public.challenge_translations
  for select to anon, authenticated
  using (exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.owner_id is null and c.circle_id is null
      and c.archived_at is null and c.published_at is not null
  ));

grant select on public.content_translations, public.reading_plan_translations,
  public.challenge_translations to anon, authenticated;

-- Detalhe do plano: cada dia traz também o id do conteúdo, para o app achar a tradução do dia.
create or replace function public.reading_plan_detail(p_plan_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.reading_plans;
  v_progress public.user_reading_plans;
  v_today date;
  v_total integer;
  v_live boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select * into v_plan from public.reading_plans p
  where p.id = p_plan_id and p.published_at is not null and p.archived_at is null
    and (p.owner_id is null or p.owner_id = v_user_id);
  if v_plan.id is null then raise exception 'not_found'; end if;

  select * into v_progress from public.user_reading_plans u
  where u.user_id = v_user_id and u.plan_id = p_plan_id;

  v_today := public.user_local_date(v_user_id);
  v_live := v_progress.user_id is not null
    and public.event_progress_live(v_plan.event_slug, v_progress.started_at, v_today);
  select count(*) into v_total from public.reading_plan_days d where d.plan_id = p_plan_id;

  return jsonb_build_object(
    'id', v_plan.id,
    'title', v_plan.title,
    'description', v_plan.description,
    'icon', v_plan.icon,
    'custom', v_plan.owner_id is not null,
    'external_url', v_plan.external_url,
    'days', v_total,
    'status', case
      when not v_live then 'none'
      when v_progress.completed_at is not null then 'done'
      when v_progress.active then 'active'
      else 'paused'
    end,
    'last_day_done', case when v_live then v_progress.last_day_done else 0 end,
    'done_today', v_live and coalesce(v_progress.last_day_done_on = v_today, false),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', d.day_number,
          'content_id', c.id,
          'title', c.title,
          'passage_reference', c.passage_reference,
          'state', case
            when v_live and d.day_number <= v_progress.last_day_done then 'done'
            when d.day_number = case when v_live then v_progress.last_day_done else 0 end + 1 then 'next'
            else 'locked'
          end
        )
        order by d.day_number
      )
      from public.reading_plan_days d
      join public.content c on c.id = d.content_id
      where d.plan_id = p_plan_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.reading_plan_detail(uuid) from public, anon;
grant execute on function public.reading_plan_detail(uuid) to authenticated;
