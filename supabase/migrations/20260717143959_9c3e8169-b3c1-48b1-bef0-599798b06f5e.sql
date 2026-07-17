-- Phase 1: Separate System Owner from Export Manager
-- Narrow is_admin to system_owner only (used by 21 RLS policies), and
-- rewrite has_permission so ONLY system_owner short-circuits to full access.
-- Export Manager becomes a normal role scoped by role_permissions rows.

-- 1) Narrow is_admin -> system_owner only (backward-compatible signature)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'system_owner'
  )
$$;

-- 2) has_permission: only system_owner gets automatic full access.
--    Order preserved: negative overrides > positive overrides > owner short-circuit > role_permissions.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM public.user_permissions
                   WHERE user_id=_user_id AND permission_code=_code AND granted=false) THEN false
      WHEN EXISTS (SELECT 1 FROM public.user_permissions
                   WHERE user_id=_user_id AND permission_code=_code AND granted=true)  THEN true
      WHEN public.is_system_owner(_user_id) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.user_roles ur ON ur.role = rp.role
        WHERE ur.user_id=_user_id AND rp.permission_code=_code
      ) THEN true
      ELSE false
    END
$$;

-- 3) Lock down EXECUTE to authenticated only (revoke anon/PUBLIC)
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_system_owner(uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_export_manager(uuid)     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_permission(uuid, text)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid)              TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_system_owner(uuid)       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_export_manager(uuid)     TO authenticated;