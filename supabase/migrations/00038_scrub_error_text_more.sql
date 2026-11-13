-- Lumi — limpeza de texto nos relatórios de erro (achado T-008 do loop de agentes).
--
-- Além do texto entre aspas duplas, e-mails e links, agora também saem o texto entre aspas curvas e entre crases e
-- tokens de acesso (três trechos separados por ponto, começando em eyJ). Aspas simples continuam, porque o JavaScript
-- as usa em mensagens técnicas ('Cannot read properties of undefined').

create or replace function public.scrub_error_text(p_text text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(coalesce(p_text, ''), '"[^"]*"', '"…"', 'g'),
              '“[^”]*”', '“…”', 'g'
            ),
            '`[^`]*`', '`…`', 'g'
          ),
          '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'
        ),
        'https?://\S+', '[link]', 'g'
      ),
      'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*', '[token]', 'g'
    ),
    1500
  );
$$;

revoke execute on function public.scrub_error_text(text) from public, anon, authenticated;
