-- Lumi — recompensas dos desafios (itens do Lumi).
--
-- O item que cada desafio dá é definido no app (src/features/lumi/outfits.ts); aqui o banco só informa
-- QUAIS desafios a pessoa já concluiu, para o guarda-roupa liberar os itens. Devolve o `slug` de cada
-- desafio de exemplo concluído e 'custom' quando concluiu algum desafio criado por ela mesma. Conta
-- também os desafios já arquivados (o que se ganhou não se perde).

create or replace function public.my_challenge_rewards()
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  -- Fecha o que já bateu a meta ou passou do prazo antes de contar.
  perform public.refresh_user_challenges(v_user_id);

  return coalesce((
    select array_agg(distinct case when c.owner_id is null then c.slug else 'custom' end)
    from public.user_challenges uc
    join public.challenges c on c.id = uc.challenge_id
    where uc.user_id = v_user_id and uc.status = 'completed'
  ), '{}');
end;
$$;

revoke execute on function public.my_challenge_rewards() from public, anon;
grant execute on function public.my_challenge_rewards() to authenticated;
