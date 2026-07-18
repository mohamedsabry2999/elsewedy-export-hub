CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_entity_id UUID;
  v_raw_id TEXT;
  v_details JSONB;
  v_changed JSONB;
  v_key TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_raw_id := row_to_json(OLD)->>'id';
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_raw_id := row_to_json(NEW)->>'id';
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    v_raw_id := row_to_json(NEW)->>'id';
    v_changed := '{}'::jsonb;
    FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF to_jsonb(NEW)->v_key IS DISTINCT FROM to_jsonb(OLD)->v_key
         AND v_key NOT IN ('updated_at','created_at') THEN
        v_changed := v_changed || jsonb_build_object(v_key,
          jsonb_build_object('from', to_jsonb(OLD)->v_key, 'to', to_jsonb(NEW)->v_key));
      END IF;
    END LOOP;
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    v_details := jsonb_build_object('changed', v_changed);
  END IF;

  BEGIN
    v_entity_id := v_raw_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_entity_id := NULL;
  END;

  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (v_actor, lower(TG_OP), TG_TABLE_NAME, v_entity_id, v_details);

  RETURN COALESCE(NEW, OLD);
END $$;