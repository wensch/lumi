-- Lumi — consentimento dos pais para crianças (LGPD, art. 14).
--
-- Quem escolhe a faixa "Criança" no cadastro só termina o cadastro depois que um responsável informa nome e e-mail e
-- confirma o consentimento. O registro guarda a versão do texto e a data. complete_onboarding passa a recusar a faixa
-- 'kid' sem esse registro (erro parental_consent_required), então o app não é a única barreira.

create table if not exists public.parental_consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  guardian_name text not null check (char_length(btrim(guardian_name)) between 2 and 100),
  guardian_email text not null check (char_length(guardian_email) <= 200 and guardian_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  consent_version text not null check (char_length(consent_version) between 1 and 20),
  consented_at timestamptz not null default now()
);

alter table public.parental_consents enable row level security;
revoke all on public.parental_consents from anon, authenticated;

create trigger parental_consents_guard_text before insert or update of guardian_name on public.parental_consents
  for each row execute function public.guard_visible_text('guardian_name');

create or replace function public.record_parental_consent(
  p_guardian_name text,
  p_guardian_email text,
  p_version text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_guardian_name is null or char_length(btrim(p_guardian_name)) not between 2 and 100
     or p_guardian_email is null or char_length(p_guardian_email) > 200
     or p_guardian_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or p_version is null or char_length(p_version) not between 1 and 20 then
    raise exception 'invalid_input';
  end if;

  insert into public.parental_consents (user_id, guardian_name, guardian_email, consent_version)
  values (v_user_id, btrim(p_guardian_name), btrim(p_guardian_email), p_version)
  on conflict (user_id) do update
    set guardian_name = excluded.guardian_name,
        guardian_email = excluded.guardian_email,
        consent_version = excluded.consent_version,
        consented_at = now();
end;
$$;

revoke execute on function public.record_parental_consent(text, text, text) from public, anon;
grant execute on function public.record_parental_consent(text, text, text) to authenticated;

-- complete_onboarding (00013) com a exigência do consentimento para a faixa 'kid'.
create or replace function public.complete_onboarding(
  p_display_name text,
  p_age_range text,
  p_preferred_time time
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'Nome de exibição não pode ser vazio';
  end if;

  if length(p_display_name) > 100 then
    raise exception 'Nome de exibição muito longo';
  end if;

  if p_age_range is null or p_age_range not in ('kid', 'teen', 'adult', 'senior') then
    raise exception 'Faixa etária inválida: %', p_age_range;
  end if;

  if p_preferred_time is null then
    raise exception 'Horário preferido não pode ser vazio';
  end if;

  if p_age_range = 'kid' and not exists (
    select 1 from public.parental_consents pc where pc.user_id = v_user_id
  ) then
    raise exception 'parental_consent_required';
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      age_range = p_age_range,
      preferred_time = p_preferred_time,
      onboarding_completed_at = now(),
      updated_at = now()
  where id = v_user_id;

  update public.notification_preferences
  set preferred_time = p_preferred_time,
      updated_at = now()
  where user_id = v_user_id;
end;
$$;
