
REVOKE EXECUTE ON FUNCTION public.is_system_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_export_manager(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.replace_user_roles_atomic(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_protect_last_owner() FROM PUBLIC, anon;
