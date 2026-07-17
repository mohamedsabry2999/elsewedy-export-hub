
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_comments read" ON public.task_comments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'tasks.read') OR public.is_system_owner(auth.uid()));
CREATE POLICY "task_comments insert" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND (public.has_permission(auth.uid(), 'tasks.update') OR public.is_system_owner(auth.uid())));
CREATE POLICY "task_comments update own" ON public.task_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_system_owner(auth.uid()))
  WITH CHECK (author_id = auth.uid() OR public.is_system_owner(auth.uid()));
CREATE POLICY "task_comments delete own" ON public.task_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_system_owner(auth.uid()));
CREATE TRIGGER trg_task_comments_updated BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_notify_task_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD; recipients uuid[]; r uuid;
BEGIN
  SELECT assigned_to, created_by, title INTO t FROM public.tasks WHERE id = NEW.task_id;
  recipients := ARRAY[]::uuid[];
  IF t.assigned_to IS NOT NULL AND t.assigned_to <> NEW.author_id THEN
    recipients := recipients || t.assigned_to;
  END IF;
  IF t.created_by IS NOT NULL AND t.created_by <> NEW.author_id AND NOT (t.created_by = ANY(recipients)) THEN
    recipients := recipients || t.created_by;
  END IF;
  FOREACH r IN ARRAY recipients LOOP
    PERFORM public.notify_user(r, 'تعليق جديد على مهمة', COALESCE(t.title,'مهمة') || ': ' || LEFT(NEW.body, 120),
      'task_comment','task', NEW.task_id, '/tasks');
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_task_comment_notify AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_task_comment();

CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected','cancelled');

CREATE TABLE public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  approver_id UUID,
  status public.approval_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals read" ON public.approvals FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR approver_id = auth.uid()
    OR public.has_permission(auth.uid(), 'approvals.manage')
    OR public.is_system_owner(auth.uid())
  );
CREATE POLICY "approvals insert" ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());
CREATE POLICY "approvals update" ON public.approvals FOR UPDATE TO authenticated
  USING (
    approver_id = auth.uid()
    OR public.has_permission(auth.uid(), 'approvals.manage')
    OR public.is_system_owner(auth.uid())
  )
  WITH CHECK (
    approver_id = auth.uid()
    OR public.has_permission(auth.uid(), 'approvals.manage')
    OR public.is_system_owner(auth.uid())
  );
CREATE POLICY "approvals delete" ON public.approvals FOR DELETE TO authenticated
  USING (public.is_system_owner(auth.uid()));
CREATE TRIGGER trg_approvals_updated BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_approvals_entity ON public.approvals(entity_type, entity_id);
CREATE INDEX idx_approvals_status ON public.approvals(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_notify_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.approver_id IS NOT NULL AND NEW.approver_id <> NEW.requested_by THEN
    PERFORM public.notify_user(NEW.approver_id, 'طلب موافقة جديد',
      COALESCE(NEW.reason, NEW.entity_type), 'approval_requested', NEW.entity_type, NEW.entity_id, '/approvals');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    PERFORM public.notify_user(NEW.requested_by,
      CASE WHEN NEW.status = 'approved' THEN 'تمت الموافقة على طلبك' ELSE 'تم رفض طلبك' END,
      COALESCE(NEW.decision_note, NEW.entity_type),
      'approval_decided', NEW.entity_type, NEW.entity_id, '/approvals');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_approval_notify AFTER INSERT OR UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_approval();

INSERT INTO public.permissions (code, module, action, label_ar, label_en, description) VALUES
  ('approvals.read','approvals','read','عرض الموافقات','View approvals','View approvals'),
  ('approvals.create','approvals','create','طلب موافقة','Request approval','Request approvals'),
  ('approvals.manage','approvals','manage','إدارة الموافقات','Manage approvals','Manage all approvals')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'export_manager'::app_role, code FROM public.permissions
WHERE code IN ('approvals.read','approvals.create','approvals.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_code)
SELECT r::app_role, c FROM (VALUES
  ('sales_specialist','approvals.read'),('sales_specialist','approvals.create'),
  ('sales_coordinator','approvals.read'),('sales_coordinator','approvals.create'),
  ('pricing','approvals.read'),('pricing','approvals.create'),
  ('logistics','approvals.read'),('logistics','approvals.create'),
  ('accounting','approvals.read'),('accounting','approvals.create'),('accounting','approvals.manage'),
  ('production','approvals.read'),('production','approvals.create'),
  ('viewer','approvals.read')
) v(r,c)
ON CONFLICT DO NOTHING;
