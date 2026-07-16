-- Fix task assignee notification: tasks table has no owner_id column
CREATE OR REPLACE FUNCTION public.tg_notify_task_assignee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE assignee UUID;
BEGIN
  assignee := NEW.assigned_to;
  IF assignee IS NOT NULL AND (TG_OP='INSERT' OR assignee IS DISTINCT FROM OLD.assigned_to) THEN
    IF assignee <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM public.notify_user(
        assignee, 'مهمة جديدة مسندة إليك',
        NEW.title, 'task_assigned', 'task', NEW.id, '/tasks'
      );
    END IF;
  END IF;
  RETURN NEW;
END $function$;