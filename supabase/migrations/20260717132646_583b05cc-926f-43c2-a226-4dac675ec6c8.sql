
-- Distinguish system_owner from export_manager (is_admin kept for backward compat)
CREATE OR REPLACE FUNCTION public.is_system_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'system_owner')
$$;

CREATE OR REPLACE FUNCTION public.is_export_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'export_manager')
$$;

GRANT EXECUTE ON FUNCTION public.is_system_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_export_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

-- Atomic role replacement with system_owner protections
CREATE OR REPLACE FUNCTION public.replace_user_roles_atomic(
  _target_user uuid,
  _new_roles app_role[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_is_owner boolean;
  v_target_is_owner boolean;
  v_new_has_owner boolean;
  v_remaining_owners int;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_actor_is_owner := public.is_system_owner(v_actor);

  -- Only system_owner OR export_manager may manage roles at all
  IF NOT (v_actor_is_owner OR public.is_export_manager(v_actor)) THEN
    RAISE EXCEPTION 'Forbidden: role management requires system_owner or export_manager';
  END IF;

  v_target_is_owner := public.is_system_owner(_target_user);
  v_new_has_owner := 'system_owner' = ANY(_new_roles);

  -- Only system_owner can grant or revoke system_owner
  IF (v_new_has_owner AND NOT v_actor_is_owner) THEN
    RAISE EXCEPTION 'Forbidden: only system_owner can grant system_owner';
  END IF;
  IF (v_target_is_owner AND NOT v_new_has_owner AND NOT v_actor_is_owner) THEN
    RAISE EXCEPTION 'Forbidden: only system_owner can revoke system_owner';
  END IF;

  -- Protect the last system_owner
  IF v_target_is_owner AND NOT v_new_has_owner THEN
    SELECT COUNT(*) INTO v_remaining_owners
      FROM public.user_roles WHERE role = 'system_owner' AND user_id <> _target_user;
    IF v_remaining_owners = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last system_owner';
    END IF;
  END IF;

  -- Transactional replace
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  IF array_length(_new_roles, 1) IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role)
    SELECT _target_user, unnest(_new_roles)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Audit trail
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (v_actor, 'roles_replace', 'user_roles', _target_user,
    jsonb_build_object('new_roles', to_jsonb(_new_roles)));
END $$;

GRANT EXECUTE ON FUNCTION public.replace_user_roles_atomic(uuid, app_role[]) TO authenticated;

-- Protect last system_owner via trigger for any direct manipulation as well
CREATE OR REPLACE FUNCTION public.tg_protect_last_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining int;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'system_owner' THEN
    SELECT COUNT(*) INTO remaining FROM public.user_roles WHERE role = 'system_owner' AND user_id <> OLD.user_id;
    IF remaining = 0 THEN RAISE EXCEPTION 'Cannot remove the last system_owner'; END IF;
  END IF;
  RETURN COALESCE(OLD, NEW);
END $$;

DROP TRIGGER IF EXISTS trg_protect_last_owner ON public.user_roles;
CREATE TRIGGER trg_protect_last_owner
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_protect_last_owner();
