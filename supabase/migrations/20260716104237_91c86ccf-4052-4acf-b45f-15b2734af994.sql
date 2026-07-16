
-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- Opportunity stage history
CREATE TABLE IF NOT EXISTS public.opportunity_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  from_stage public.opportunity_stage,
  to_stage public.opportunity_stage NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.opportunity_stage_history TO authenticated;
GRANT ALL ON public.opportunity_stage_history TO service_role;
ALTER TABLE public.opportunity_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read stage history" ON public.opportunity_stage_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert stage history" ON public.opportunity_stage_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());
CREATE INDEX IF NOT EXISTS idx_stage_history_opp ON public.opportunity_stage_history(opportunity_id, created_at DESC);

-- Trigger to auto-log stage changes
CREATE OR REPLACE FUNCTION public.tg_log_opp_stage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.opportunity_stage_history(opportunity_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, NULL, NEW.stage, auth.uid());
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.opportunity_stage_history(opportunity_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_opp_stage_history ON public.opportunities;
CREATE TRIGGER trg_opp_stage_history
  AFTER INSERT OR UPDATE OF stage ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_opp_stage();

-- Lead scoring
CREATE OR REPLACE FUNCTION public.compute_lead_score(_lead public.leads) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE score INT := 0;
BEGIN
  -- Value (0-30)
  IF _lead.expected_value IS NOT NULL THEN
    score := score + LEAST(30, GREATEST(0, (_lead.expected_value / 5000)::int));
  END IF;
  -- Temperature (0-25)
  IF _lead.temperature = 'hot' THEN score := score + 25;
  ELSIF _lead.temperature = 'warm' THEN score := score + 15;
  ELSIF _lead.temperature = 'cold' THEN score := score + 5;
  END IF;
  -- Data completeness (0-25)
  IF _lead.company_id IS NOT NULL OR _lead.company_name IS NOT NULL THEN score := score + 5; END IF;
  IF _lead.contact_id IS NOT NULL OR _lead.contact_name IS NOT NULL THEN score := score + 5; END IF;
  IF _lead.country IS NOT NULL THEN score := score + 3; END IF;
  IF _lead.product_requested IS NOT NULL THEN score := score + 4; END IF;
  IF _lead.expected_quantity IS NOT NULL THEN score := score + 4; END IF;
  IF _lead.expected_order_date IS NOT NULL THEN score := score + 4; END IF;
  -- Recency (0-20)
  IF _lead.next_followup_at IS NOT NULL AND _lead.next_followup_at > now() THEN
    score := score + 10;
  END IF;
  IF _lead.status IN ('qualified','proposal') THEN score := score + 10;
  ELSIF _lead.status = 'contacted' THEN score := score + 5;
  END IF;
  RETURN LEAST(100, GREATEST(0, score));
END $$;

CREATE OR REPLACE FUNCTION public.tg_recompute_lead_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.lead_score := public.compute_lead_score(NEW);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_leads_score ON public.leads;
CREATE TRIGGER trg_leads_score
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_lead_score();

-- Backfill existing lead scores
UPDATE public.leads SET updated_at = updated_at;

-- notify_user helper
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id UUID, _title TEXT, _body TEXT DEFAULT NULL,
  _type TEXT DEFAULT 'info', _entity_type TEXT DEFAULT NULL,
  _entity_id UUID DEFAULT NULL, _link TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid UUID;
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, entity_type, entity_id, link)
  VALUES (_user_id, _type, _title, _body, _entity_type, _entity_id, _link)
  RETURNING id INTO nid;
  RETURN nid;
END $$;

-- Notify owner on assignment (leads)
CREATE OR REPLACE FUNCTION public.tg_notify_lead_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id) THEN
    IF NEW.owner_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM public.notify_user(
        NEW.owner_id,
        'تم تعيين عميل محتمل جديد لك',
        COALESCE(NEW.company_name, NEW.contact_name, 'عميل محتمل'),
        'lead_assigned', 'lead', NEW.id, '/leads'
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_lead_owner ON public.leads;
CREATE TRIGGER trg_notify_lead_owner
  AFTER INSERT OR UPDATE OF owner_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_lead_owner();

-- Notify assignee on task assignment
CREATE OR REPLACE FUNCTION public.tg_notify_task_assignee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE assignee UUID;
BEGIN
  assignee := COALESCE(NEW.assigned_to, NEW.owner_id);
  IF assignee IS NOT NULL AND (TG_OP='INSERT' OR assignee IS DISTINCT FROM COALESCE(OLD.assigned_to, OLD.owner_id)) THEN
    IF assignee <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM public.notify_user(
        assignee, 'مهمة جديدة مسندة إليك',
        NEW.title, 'task_assigned', 'task', NEW.id, '/tasks'
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE has_assigned BOOLEAN; BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_to') INTO has_assigned;
  IF has_assigned OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='owner_id') THEN
    DROP TRIGGER IF EXISTS trg_notify_task_assignee ON public.tasks;
    CREATE TRIGGER trg_notify_task_assignee
      AFTER INSERT OR UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.tg_notify_task_assignee();
  END IF;
END $$;
