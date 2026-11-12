-- Lumi — correção da 00034: texto vazio ('') voltava a ser barrado pelo gatilho guard_visible_text
-- (a expressão "só espaços e U+200D" usava * e casava com o vazio), e isso quebrava desafios e planos sem descrição.
-- Agora só barra texto NÃO vazio feito apenas de espaços e U+200D.

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
         or v_value ~ '^[[:space:]‍]+$'
       ) then
      raise exception 'invalid_input';
    end if;
  end loop;
  return new;
end;
$$;
