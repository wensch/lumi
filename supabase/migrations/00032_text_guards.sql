-- Lumi — proteções de texto (achados do loop de agentes, ciclo 1).
--
-- 1) O nome de exibição podia ser trocado direto por PATCH em `profiles` (grant de coluna da 00013) sem limite:
--    um nome de 500 mil caracteres era aceito e depois devolvido a outras pessoas (prévia de convite, grupo do
--    desafio, push). Agora há teto de 100 caracteres (o mesmo de complete_onboarding), valendo para novas gravações.
-- 2) A validação de "texto limpo" das funções de criar desafio/plano deixava passar caracteres invisíveis e de
--    direção (U+2061–206F, U+2800, U+3164, U+115F/1160, U+FFA0, U+00AD...). Um gatilho barra esses caracteres em
--    qualquer caminho de gravação, com o mesmo código de erro do app (invalid_input).

alter table public.profiles
  add constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 100) not valid;

create or replace function public.guard_visible_text()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_col text;
  v_value text;
begin
  foreach v_col in array tg_argv loop
    v_value := to_jsonb(new) ->> v_col;
    if v_value is not null
       and v_value ~ '[[:cntrl:]­͏؜ᅟᅠ឴឵᠋-᠏​-‏ -‮⁠-⁯⠀ㅤ﻿ﾠ]' then
      raise exception 'invalid_input';
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function public.guard_visible_text() from public, anon, authenticated;

create trigger challenges_guard_text before insert or update of title, description on public.challenges
  for each row execute function public.guard_visible_text('title', 'description');
create trigger reading_plans_guard_text before insert or update of title, description on public.reading_plans
  for each row execute function public.guard_visible_text('title', 'description');
create trigger circles_guard_text before insert or update of name on public.circles
  for each row execute function public.guard_visible_text('name');
create trigger profiles_guard_text before insert or update of display_name on public.profiles
  for each row execute function public.guard_visible_text('display_name');
-- Dias de plano próprio (content com dono): só o título; o texto do dia pode ter quebras de linha.
create trigger content_owner_guard_text before insert or update of title on public.content
  for each row when (new.owner_id is not null) execute function public.guard_visible_text('title');
