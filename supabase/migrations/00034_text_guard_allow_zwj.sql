-- Lumi — ajuste da 00032 (achado da Segurança do loop, ciclo 2).
--
-- O gatilho guard_visible_text barrava U+200D (junção de largura zero), que também forma emoji compostos
-- (família 👨‍👩‍👧, bandeira arco-íris 🏳️‍🌈): nomes e círculos com esses emoji davam invalid_input. Agora o U+200D passa,
-- mas um texto só de U+200D e espaços (nome "invisível") continua barrado.

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
       and (
         v_value ~ '[[:cntrl:]­͏؜ᅟᅠ឴឵᠋-᠏​‌‎‏ -‮⁠-⁯⠀ㅤ﻿ﾠ]'
         or v_value ~ '^[[:space:]‍]*$'
       ) then
      raise exception 'invalid_input';
    end if;
  end loop;
  return new;
end;
$$;
