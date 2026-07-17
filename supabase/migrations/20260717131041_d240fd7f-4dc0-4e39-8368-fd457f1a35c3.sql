
-- Fix: authenticated role could not execute the security-definer helpers used
-- inside RLS policies on user_roles / user_permissions, so role loading returned
-- 403 and every permission-gated UI element was hidden.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, anon;
