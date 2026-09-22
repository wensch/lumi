-- Lumi — corrige alerta do Security Advisor: handle_new_user() era exposta
-- via API REST (/rpc/handle_new_user) para qualquer usuário autenticado,
-- quando deveria rodar só pelo trigger on_auth_user_created.
-- Revoga EXECUTE do role authenticated/anon; mantém apenas o trigger.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
