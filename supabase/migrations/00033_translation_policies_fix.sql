-- Lumi — correção das políticas de leitura das traduções (achado do QA do loop, ciclo 1).
--
-- As políticas de reading_plan_translations e challenge_translations (00029) consultavam reading_plans e challenges
-- DENTRO da política, mas anon/authenticated não têm SELECT nessas tabelas (revogado de propósito nas 00019/00020):
-- a leitura inteira falhava com "permission denied" e o app em inglês continuava com planos e desafios em português.
-- Agora a checagem de "publicado e editorial" fica em funções SECURITY DEFINER (só devolvem verdadeiro/falso).

create or replace function public.is_published_plan(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.reading_plans p
    where p.id = p_id and p.owner_id is null and p.archived_at is null and p.published_at is not null
  );
$$;

create or replace function public.is_published_challenge(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.challenges c
    where c.id = p_id and c.owner_id is null and c.circle_id is null
      and c.archived_at is null and c.published_at is not null
  );
$$;

revoke execute on function public.is_published_plan(uuid) from public;
revoke execute on function public.is_published_challenge(uuid) from public;
grant execute on function public.is_published_plan(uuid) to anon, authenticated;
grant execute on function public.is_published_challenge(uuid) to anon, authenticated;

alter policy "reading_plan_translations_select_published" on public.reading_plan_translations
  using (public.is_published_plan(plan_id));
alter policy "challenge_translations_select_published" on public.challenge_translations
  using (public.is_published_challenge(challenge_id));
