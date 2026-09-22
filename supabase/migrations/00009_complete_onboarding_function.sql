-- Lumi — função atômica para concluir o onboarding: atualiza profiles e
-- notification_preferences numa única transação. Corrige bug encontrado
-- em pente-fino: as duas escritas eram sequenciais no client, então uma
-- falha na segunda (notification_preferences) depois da primeira suceder
-- (profiles.onboarding_completed_at) deixava o usuário marcado como
-- "onboarding completo" sem preferência de notificação configurada e sem
-- caminho de correção pela UI (RootNavigation nunca mais mostra onboarding
-- de novo, pois olha só profiles.onboarding_completed_at).

create function public.complete_onboarding(
  p_display_name text,
  p_age_range text,
  p_preferred_time time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  update public.profiles
  set display_name = p_display_name,
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

revoke execute on function public.complete_onboarding(text, text, time) from public;
revoke execute on function public.complete_onboarding(text, text, time) from anon;
grant execute on function public.complete_onboarding(text, text, time) to authenticated;

comment on function public.complete_onboarding is 'Conclui o onboarding atomicamente: profiles + notification_preferences numa única transação, evitando estado parcial se uma das duas escritas falhar.';
