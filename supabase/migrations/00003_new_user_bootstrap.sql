-- Lumi — bootstrap de linhas dependentes na criação do usuário.
-- Evita que o app precise de múltiplas escritas coordenadas no primeiro login.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.streaks (user_id) values (new.id);
  insert into public.lumi_state (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
